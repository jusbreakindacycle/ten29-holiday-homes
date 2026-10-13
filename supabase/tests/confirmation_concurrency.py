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
