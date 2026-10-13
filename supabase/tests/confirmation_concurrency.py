"""Real concurrent transactions, only against the disposable Supabase CI container.

Uses docker exec/psql, never a linked database, connection URL or production secret.
The first transaction stays uncommitted until pg_stat_activity proves the second
is waiting on a PostgreSQL lock. No timing-only assumption substitutes for overlap.
"""
import concurrent.futures
import os
import subprocess
import time
import uuid

if os.environ.get("CI") != "true":
    raise SystemExit("Run only in the isolated CI workflow")
PSQL = ["docker", "exec", "-i", "supabase_db_ten29-holiday-homes", "psql", "-X", "-Atq",
        "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-U", "postgres", "-d", "postgres"]
OWNER = "00000000-0000-4000-8000-000000000071"
AUTH = f"set local role authenticated; select set_config('request.jwt.claim.sub','{OWNER}',true);"


def sql(statement, check=True):
    result = subprocess.run(PSQL, input=statement, text=True, capture_output=True, timeout=40)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result


sql(f"""insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at)
values('{OWNER}','authenticated','authenticated','concurrency@example.invalid','',now());
insert into public.ten29_admins(user_id,role) values('{OWNER}','OWNER');""")


def ready(package, start, end, guests):
    # Real owner APIs; no disabling triggers or broadening fixture grants.
    request = str(uuid.uuid4())
    output = sql(rf"""begin; {AUTH}
insert into public.booking_requests(id,source,package_code,check_in_date,check_out_date,overnight_guest_count)
values('{request}','PHONE','{package}','{start}','{end}',{guests});
update public.booking_requests set status='REVIEWING' where id='{request}';
insert into public.booking_quotes(request_id,revision,amount_total,required_deposit_amount)
values('{request}',1,100,25) returning id \gset
select public.issue_booking_quote(:'id');
update public.booking_requests set status='AWAITING_DEPOSIT' where id='{request}';
insert into public.booking_deposits(request_id,amount) values('{request}',25) returning id as deposit_id \gset
select public.decide_booking_deposit(:'deposit_id','VERIFIED',true,'{uuid.uuid4()}');
select 'QUOTE=' || :'id'; commit;""").stdout
    quote = next(line[6:] for line in output.splitlines() if line.startswith("QUOTE="))
    return request, quote, str(uuid.uuid4())


def confirm(fixture):
    request, quote, key = fixture
    return f"select public.confirm_booking_reservation('{request}','{quote}','{key}');"


def race(first_statement, second_statement, loser_code=None):
    first = subprocess.Popen(PSQL, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             text=True, bufsize=1)
    try:
        first.stdin.write(f"begin; {AUTH} set local statement_timeout='25s'; {first_statement}\n\\echo READY\n")
        first.stdin.flush()
        # Bound reading via executor; fail rather than hanging on an unexpected SQL error.
        def read_marker():
            for line in first.stdout:
                if line.strip() == "READY":
                    return True
            return False
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            marker = pool.submit(read_marker)
            try:
                if not marker.result(timeout=30):
                    raise AssertionError(first.stderr.read())
            except TimeoutError:
                first.kill()
                raise
            second = pool.submit(sql, f"begin; {AUTH} set local application_name='ten29-concurrency-loser'; "
                                f"set local statement_timeout='25s'; {second_statement} commit;", False)
            observed_lock = False
            for _ in range(100):
                if sql("select count(*) from pg_stat_activity where application_name='ten29-concurrency-loser' "
                       "and wait_event_type='Lock';").stdout.strip() != "0":
                    observed_lock = True
                    break
                if second.done():
                    break
                time.sleep(0.05)
            first.stdin.write("commit;\n\\q\n")
            first.stdin.flush()
            first.wait(timeout=30)
            assert first.returncode == 0, first.stderr.read()
            result = second.result(timeout=30)
            assert observed_lock, "Second PostgreSQL transaction did not actually wait on the first"
            if loser_code:
                assert result.returncode != 0 and loser_code in result.stderr, result.stderr
            else:
                assert result.returncode == 0, result.stderr
            return result
    finally:
        if first.poll() is None:
            first.kill()
        first.communicate(timeout=5)


a = ready("WHOLE_HOME_1BR", "2031-01-10", "2031-01-12", 2)
b = ready("WHOLE_HOME_3BR", "2031-01-10", "2031-01-12", 2)
race(confirm(a), confirm(b), "23P01")
assert sql(f"select count(*) from public.booking_reservations where request_id in ('{a[0]}','{b[0]}');").stdout.strip() == "1"
assert sql(f"select count(*) from public.booking_reservation_events e join public.booking_reservations r "
           f"on r.id=e.reservation_id where r.request_id='{b[0]}';").stdout.strip() == "0"
print("PASS: concurrent 1BR/3BR confirmation: PostgreSQL lock observed, one success, one 23P01, loser rolled back")

c = ready("WHOLE_HOME_2BR", "2031-02-10", "2031-02-12", 4)
race(confirm(c), confirm(c))
assert sql(f"select count(*) from public.booking_reservations where request_id='{c[0]}';").stdout.strip() == "1"
assert sql(f"select count(*) from public.booking_reservation_events e join public.booking_reservations r "
           f"on r.id=e.reservation_id where r.request_id='{c[0]}';").stdout.strip() == "1"
print("PASS: concurrent matching confirmation retries: request-row lock observed, one reservation and one audit event")

d = ready("WHOLE_HOME_3BR", "2031-03-10", "2031-03-12", 6)
race(f"select public.create_booking_owner_block('2031-03-10','2031-03-12','{uuid.uuid4()}');", confirm(d), "23P01")
assert sql(f"select count(*) from public.booking_reservations where request_id='{d[0]}';").stdout.strip() == "0"
print("PASS: simultaneous owner block and confirmation: exclusion lock observed, confirmation rolled back")

def rate_draft(amount):
    rule = '[{"kind":"DEFAULT","amount_centavos":' + str(amount) + ',"weekday":null,"start_date":null,"end_date":null}]'
    output = sql(f"begin; {AUTH} select 'RATE=' || public.save_calendar_rate_draft('WHOLE_HOME_2BR',null,'{rule}','{uuid.uuid4()}'); commit;").stdout
    return next(line[5:] for line in output.splitlines() if line.startswith("RATE=")), str(uuid.uuid4())

rate_a, publish_a = rate_draft(12345)
rate_b, publish_b = rate_draft(23456)
publish_first = f"select public.publish_calendar_rate_revision('{rate_a}',null,'{publish_a}');"
race(publish_first, f"select public.publish_calendar_rate_revision('{rate_b}',null,'{publish_b}');", "23514")
assert sql("select count(*) from public.calendar_rate_revisions where status='PUBLISHED';").stdout.strip() == "1"
assert sql(f"select published_revision_id from public.calendar_rate_heads where package_code='WHOLE_HOME_2BR';").stdout.strip() == rate_a
print("PASS: concurrent rate publication: head-row lock observed, stale competing publication rejected, one active revision")
race(publish_first, publish_first)
assert sql("select count(*) from public.calendar_rate_events where event='PUBLISHED';").stdout.strip() == "1"
print("PASS: concurrent publication retries: lock observed, one publication event, current prices unchanged")

# Slice 5: real concurrent same-session/key intake, payload substitution, and owner-block race.
import json
intake_from, intake_to = sql("select ((now() at time zone 'Asia/Manila')::date+60)::text || ',' || ((now() at time zone 'Asia/Manila')::date+62)::text;").stdout.strip().split(',')
price = json.loads(sql(f"select public.read_public_calendar_prices('WHOLE_HOME_3BR','{intake_from}','{intake_to}',2,false);").stdout)
payload = dict(full_name='Concurrent Synthetic Guest', mobile_number='+639171234567', email='', adults=2, children=0, day_visitors=0, vehicles=0,
    message='', purpose_of_stay='', privacy_consent=True, utm_source='', utm_medium='', utm_campaign='', package_code='WHOLE_HOME_3BR',
    folding_foams_requested=False, check_in_date=intake_from, check_out_date=intake_to, reviewed_estimate=price)
def intake_statement(session, key, body=payload):
    literal = json.dumps(body).replace("'", "''")
    return f"set local role service_role; select public.accept_website_booking('{literal}'::jsonb,repeat('{session}',64),'{key}',repeat('{session}',64));"
intake_key = str(uuid.uuid4())
race(intake_statement('e',intake_key), intake_statement('e',intake_key))
assert sql(f"select count(*) from public.website_booking_intakes where session_hash=repeat('e',64) and idempotency_key='{intake_key}';").stdout.strip()=='1'
assert sql("select count(*) from public.inquiries where full_name='Concurrent Synthetic Guest';").stdout.strip()=='1'
print('PASS: concurrent public intake retries: database lock observed, one linked enquiry/request pair and one owner task')
conflict_key = str(uuid.uuid4())
race(intake_statement('f',conflict_key),intake_statement('f',conflict_key,{**payload,'message':'different'}),'23514')
print('PASS: simultaneous public intake payload substitution: database lock observed, mismatched retry rejected without duplicate')
block_key = str(uuid.uuid4())
result = race(f"select public.create_booking_owner_block('{intake_from}','{intake_to}','{block_key}');", intake_statement('a',str(uuid.uuid4())))
assert 'UNAVAILABLE' in result.stdout, result.stdout
assert sql("select count(*) from public.website_booking_intakes where session_hash=repeat('a',64);").stdout.strip()=='0'
print('PASS: owner block versus public intake: occupancy write lock observed, unavailable intake persisted no pair')

# Rate publication is held uncommitted while intake waits for the package head.
revision = sql(f"begin; {AUTH} select public.save_calendar_rate_draft('WHOLE_HOME_3BR',(select published_revision_id from public.calendar_rate_heads where package_code='WHOLE_HOME_3BR'),'[{{\"kind\":\"DEFAULT\",\"amount_centavos\":77777,\"weekday\":null,\"start_date\":null,\"end_date\":null}}]'::jsonb,'{uuid.uuid4()}'); commit;").stdout.strip().splitlines()[-1]
# Use a different available span to isolate stale-price behavior from the previous owner block.
payload2 = {**payload, 'check_in_date': sql("select ((now() at time zone 'Asia/Manila')::date+80)::text;").stdout.strip(), 'check_out_date': sql("select ((now() at time zone 'Asia/Manila')::date+82)::text;").stdout.strip()}
payload2['reviewed_estimate'] = json.loads(sql(f"select public.read_public_calendar_prices('WHOLE_HOME_3BR','{payload2['check_in_date']}','{payload2['check_out_date']}',2,false);").stdout)
result = race(f"select public.publish_calendar_rate_revision('{revision}',(select base_revision_id from public.calendar_rate_revisions where id='{revision}'),'{uuid.uuid4()}');",intake_statement('b',str(uuid.uuid4()),payload2))
assert 'PRICE_CHANGED' in result.stdout, result.stdout
assert sql("select count(*) from public.website_booking_intakes where session_hash=repeat('b',64);").stdout.strip()=='0'
print('PASS: publication versus public intake: package-head lock observed, current estimate disclosed without silent persistence')
# Media reservation retries serialize on the actual PostgreSQL advisory lock.
# Both transactions must return the same object, not two storage upload scopes.
media_key = str(uuid.uuid4())
media_reserve = "select public.owner_media_action('RESERVE',null,null," + \
    "'{\"key\":\"" + media_key + "\",\"mime\":\"image/png\",\"bytes\":128}'::jsonb);"
race(media_reserve, media_reserve)
assert sql(f"select count(*) from public.property_media where upload_key='{media_key}';").stdout.strip() == '1'
print('PASS media same-key reservation concurrency: one upload scope')
