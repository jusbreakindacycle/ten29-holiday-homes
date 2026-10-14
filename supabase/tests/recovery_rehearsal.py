"""Synthetic CI-only recovery drill. Never accepts a database URL or linked project.

A fresh, unrouted database in the disposable cluster rehearses logical recovery.
Cluster roles already exist: cross-project role/configuration recovery remains UAT.
No dumps, object bytes, credentials or guest rows are printed/uploaded as artifacts.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request
import urllib.error
import uuid
import time
import re

if os.environ.get('CI') != 'true' or os.environ.get('TEN29_PROVIDER_E2E') != 'true':
    raise SystemExit('Disposable provider CI only')
config = json.loads(subprocess.run(['supabase', 'status', '-o', 'json'], capture_output=True, text=True, check=True).stdout)
if config['API_URL'] != 'http://127.0.0.1:54321':
    raise SystemExit('Refusing non-local provider')
CONTAINER = 'supabase_db_ten29-holiday-homes'
RESTORED = 'ten29_recovery_' + uuid.uuid4().hex

def command(args, data=None):
    result = subprocess.run(args, input=data, capture_output=True, timeout=180)
    if result.returncode:
        # Only synthetic fixed local commands run; never dump command/stdin/credentials.
        raise RuntimeError(result.stderr.decode(errors='replace')[-4000:])
    return result.stdout

def sql(statement, database='postgres'):
    return command(['docker', 'exec', '-i', CONTAINER, 'psql', '-X', '-Atq', '-v', 'ON_ERROR_STOP=1',
                    '-U', 'postgres', '-d', database], ('set search_path=public,extensions;\n' + statement).encode()).decode().strip()

owner = sql("select id from auth.users where email='ui-owner@example.invalid';")
uuid.UUID(owner)
if sql("select count(*) from auth.users where email not like '%@example.invalid';") != '0':
    raise SystemExit('Non-synthetic account detected; refusing recovery exercise')

# Add an actual completed stay through protected APIs; other categories are
# persisted by the preceding real guest/owner/media UI and concurrency suites.
sql(rf"""begin; set local role authenticated;
select set_config('request.jwt.claim.sub','{owner}',true);
select public.perform_booking_operation('MANUAL',null,'{uuid.uuid4()}',
'{{"source":"PHONE","package_code":"WHOLE_HOME_3BR","check_in_date":"1999-01-01","check_out_date":"1999-01-02","overnight_guest_count":2,"folding_foams_requested":false,"full_name":"Synthetic recovery guest","contact_number":"synthetic-only","email":"recovery@example.invalid","notes":"Recovery exercise"}}') as r \gset
update public.booking_requests set status='REVIEWING' where id=:'r';
insert into public.booking_quotes(request_id,revision,amount_total,required_deposit_amount) values(:'r',1,100,25) returning id as q \gset
select public.issue_booking_quote(:'q');
update public.booking_requests set status='AWAITING_DEPOSIT' where id=:'r';
insert into public.booking_deposits(request_id,amount) values(:'r',25) returning id as d \gset
select public.decide_booking_deposit(:'d','VERIFIED',true,'{uuid.uuid4()}');
select public.confirm_booking_reservation(:'r',:'q','{uuid.uuid4()}') as stay \gset
select public.perform_booking_operation('COMPLETE',:'stay','{uuid.uuid4()}','{{"reason":"Synthetic recovery completion"}}'); commit;""")

def storage(method, path, body=None, mime=None):
    headers = {'apikey': config['SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + config['SERVICE_ROLE_KEY']}
    if mime:
        headers['Content-Type'] = mime
    request = urllib.request.Request(config['API_URL'] + '/storage/v1/' + path, data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read(), response.headers.get('Content-Type')

media = json.loads(sql("select row_to_json(m) from public.property_media m where cleaned_at is null and state in ('READY_FOR_REVIEW','PUBLISHED','UNPUBLISHED') limit 1;"))
uuid.UUID(media['id'])
assert media['original_key'].startswith(media['id'] + '/')
object_path = 'object/ten29-originals/' + media['original_key']
original, mime = storage('GET', object_path)
digest = hashlib.sha256(original).hexdigest()
# API deletion/re-upload, not raw storage metadata edits. Private rendition and
# publication state remain unchanged; a failed re-upload fails the drill.
storage('DELETE', 'object/ten29-originals', json.dumps({'prefixes': [media['original_key']]}).encode(), 'application/json')
try:
    storage('GET', object_path)
    raise AssertionError('Deleted object still readable')
except urllib.error.HTTPError as error:
    assert error.code in (400, 404)
storage('POST', object_path, original, mime)
recovered, _ = storage('GET', object_path)
assert hashlib.sha256(recovered).hexdigest() == digest
print('Storage recovery: synthetic private original deleted, restored through API, SHA-256 matched')

tables = sql("select schemaname || '.' || tablename from pg_tables where schemaname in ('public','ten29_private','supabase_migrations') or (schemaname='auth' and tablename='users') or (schemaname='storage' and tablename in ('objects','buckets')) order by 1;").splitlines()

def fingerprints(database):
    return {table: sql(f"select count(*) || ':' || md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' order by row_to_json(t)::text),'')) from {table} t;", database) for table in tables}

security = """select md5(string_agg(value,E'\n' order by value)) from (
 select 'policy:' || row_to_json(p)::text value from pg_policies p where schemaname in ('public','ten29_private','storage')
 union all select 'function:' || pg_get_functiondef(p.oid) || pg_get_userbyid(p.proowner) || array(select concat(x.grantee,':',x.grantor,':',x.privilege_type,':',x.is_grantable) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x order by 1)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','ten29_private') and p.prokind='f'
 union all select 'constraint:' || n.nspname || '.' || c.relname || ':' || pg_get_constraintdef(k.oid) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ten29_private')
 union all select 'rls:' || n.nspname || '.' || c.relname || ':' || c.relrowsecurity::text || ':' || pg_get_userbyid(c.relowner) || array(select concat(x.grantee,':',x.grantor,':',x.privilege_type,':',x.is_grantable) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x order by 1)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ten29_private') and c.relkind='r'
) s;"""
before = fingerprints('postgres')
before_security = sql(security)
for table in ['public.inquiries','public.website_booking_intakes','public.manual_booking_contacts','public.booking_quotes',
              'public.booking_deposit_verifications','public.booking_reservations','public.property_occupancies',
              'public.calendar_rate_revisions','public.booking_operation_events','public.booking_policy_events','public.media_audit_events']:
    assert int(before[table].split(':')[0]) > 0, 'Missing representative fixture: ' + table

with tempfile.TemporaryDirectory(prefix='ten29-synthetic-recovery-') as temp:
    started = time.monotonic()
    backup = Path(temp) / 'database.backup'
    backup.write_bytes(command(['docker', 'exec', CONTAINER, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '-Fc']))
    backup.chmod(0o600)
    sql(f'create database {RESTORED} template template0;')
    try:
        # Platform-owned schemas require the existing local platform owner.
        # Never widen postgres/application grants to accommodate the fixture.
        command(['docker', 'exec', '-i', CONTAINER, 'pg_restore', '-U', 'supabase_admin', '-d', RESTORED, '--exit-on-error'], backup.read_bytes())
        assert fingerprints(RESTORED) == before, 'Restored rows differ'
        if sql(security, RESTORED) != before_security:
            # Catalog metadata only: no rows, function bodies, keys or contacts.
            metadata = """select json_object_agg(name,value) from (
              select 'function:'||p.oid::regprocedure::text name,json_build_object('owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'definition',md5(pg_get_functiondef(p.oid))) value from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','ten29_private') and p.prokind='f'
              union all select 'table:'||n.nspname||'.'||c.relname,json_build_object('owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','ten29_private') and c.relkind='r'
            ) s;"""
            old, new = json.loads(sql(metadata)), json.loads(sql(metadata,RESTORED))
            print('Restored protection mismatch metadata:', json.dumps({key:{'before':old.get(key),'after':new.get(key)} for key in old.keys() | new.keys() if old.get(key)!=new.get(key)}))
            raise AssertionError('Restored protections differ')
        assert sql("select count(*) from public.property_occupancies a join public.property_occupancies b on a.id<b.id and a.active and b.active and a.property_id=b.property_id and daterange(a.check_in_date,a.check_out_date,'[)') && daterange(b.check_in_date,b.check_out_date,'[)');", RESTORED) == '0'
        assert sql(f"select original_key from public.property_media where id='{media['id']}';", RESTORED) == media['original_key']
        # Existing suites assume empty fixtures; never delete recovered history
        # to satisfy them. Verify live restored records with dedicated checks.
        # The Supabase database image includes psql and server pgTAP, not the
        # separate CLI pg_prove runner. Execute actual SQL and validate TAP.
        # Supabase CLI installs its test extension transiently; it is absent
        # from the source backup. Add the harness only after integrity checks.
        command(['docker', 'exec', '-i', CONTAINER, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', RESTORED],
                b'create extension if not exists pgtap with schema extensions;')
        output = sql(Path('supabase/recovery/restored_integrity.sql').read_text(), RESTORED)
        tap = [line for line in output.splitlines() if re.match(r'^(ok |not ok |1\.\.|#)', line)]
        print('\n'.join(tap))
        plans = [int(line[3:]) for line in tap if re.fullmatch(r'1\.\.[0-9]+', line)]
        assertions = [line for line in tap if re.match(r'^(ok|not ok) [0-9]+', line)]
        assert len(plans) == 1 and plans[0] > 0 and len(assertions) == plans[0], 'Incomplete restored SQL assertions'
        assert all(line.startswith('ok ') and '# SKIP' not in line.upper() for line in assertions), 'Failed/skipped restored SQL assertion'
        print(f'Restored PostgreSQL pgTAP assertions: {plans[0]} passed, zero skipped')
        print(f'Database recovery: {len(tables)} table fingerprints and security definitions matched; no active overlaps; restored Storage reference matched recovered bytes')
        print(f'Synthetic backup/restore/validation elapsed seconds: {time.monotonic() - started:.2f}; not a production RTO')
    finally:
        # Fresh DB is never routed to Auth, Storage, email or application traffic.
        sql(f'drop database {RESTORED} with (force);')
print('Recovery rehearsal completed; sensitive temporary backup removed; no artifact uploaded')
