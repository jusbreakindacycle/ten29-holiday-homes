"""Provision synthetic UI accounts only in the disposable local CI Supabase stack."""
import json
import os
import subprocess
import urllib.request
import uuid

if os.environ.get("CI") != "true":
    raise SystemExit("Run only in disposable CI")
config = json.loads(subprocess.run(["supabase", "status", "-o", "json"], capture_output=True, text=True, check=True).stdout)
api = config["API_URL"]
if api != "http://127.0.0.1:54321":
    raise SystemExit("Refusing non-local Supabase endpoint")
service = config["SERVICE_ROLE_KEY"]
env = {
    "NEXT_PUBLIC_SUPABASE_URL": api,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": config["ANON_KEY"],
    "SUPABASE_SERVICE_ROLE_KEY": service,
    "TEN29_PROVIDER_E2E": "true",
}
password = "Synthetic-ci-account-only-42!"
psql = ["docker", "exec", "-i", "supabase_db_ten29-holiday-homes", "psql", "-X", "-Atq", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"]

def sql(statement):
    result = subprocess.run(psql, input=statement, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)  # SQL contains only synthetic local fixture data.
    return result.stdout

owner_id = None
for role in ["OWNER", "MANAGER"]:
    email = f"ui-{role.lower()}@example.invalid"
    request = urllib.request.Request(f"{api}/auth/v1/admin/users", data=json.dumps({"email": email, "password": password, "email_confirm": True}).encode(),
        headers={"apikey": service, "Authorization": f"Bearer {service}", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        user_id = json.load(response)["id"]
    uuid.UUID(user_id)
    sql(f"insert into public.ten29_admins(user_id,role) values('{user_id}','{role}');")
    env[f"TEN29_E2E_{role}_EMAIL"] = email
    env[f"TEN29_E2E_{role}_PASSWORD"] = password
    if role == "OWNER":
        owner_id = user_id

request_id, quote_key = str(uuid.uuid4()), str(uuid.uuid4())
output = sql(rf"""begin; set local role authenticated;
select set_config('request.jwt.claim.sub','{owner_id}',true);
insert into public.booking_requests(id,source,package_code,check_in_date,check_out_date,overnight_guest_count,folding_foams_requested)
values('{request_id}','PHONE','WHOLE_HOME_3BR','2034-01-01','2034-01-03',8,true);
update public.booking_requests set status='REVIEWING' where id='{request_id}';
select public.prepare_itemized_booking_quote('{request_id}',(select published_revision_id from public.calendar_rate_heads where package_code='WHOLE_HOME_3BR'),1000,
'[{{"type":"CHARGE","description":"Synthetic private arrangement","quantity":1,"unit_amount_centavos":200,"reason":"CI fixture owner-approved arrangement"}},
{{"type":"DISCOUNT","description":"Synthetic private discount","quantity":1,"unit_amount_centavos":100,"reason":"CI fixture owner-approved discount"}}]',
'[{{"date":"2034-01-01","amount_centavos":15000,"reason":"CI fixture manual quote exception"}},
{{"date":"2034-01-02","amount_centavos":17000,"reason":"CI fixture manual quote exception"}}]',500,'Synthetic private conditions',null,'{quote_key}') as quote_id \gset
select public.issue_itemized_booking_quote(:'quote_id');
select 'QUOTE=' || :'quote_id'; commit;""")
env["TEN29_E2E_QUOTE_ID"] = next(line[6:] for line in output.splitlines() if line.startswith("QUOTE="))
# Current synthetic guest-calendar dates remain inside the bounded public intake horizon.
dates = sql("select ((now() at time zone 'Asia/Manila')::date+20)::text || ',' || ((now() at time zone 'Asia/Manila')::date+21)::text || ',' || ((now() at time zone 'Asia/Manila')::date+22)::text || ',' || ((now() at time zone 'Asia/Manila')::date+24)::text || ',' || ((now() at time zone 'Asia/Manila')::date+26)::text || ',' || ((now() at time zone 'Asia/Manila')::date+28)::text;").strip().split(',')
env['TEN29_GUEST_DATES'] = ','.join(dates)
d1,d2,d3,blocked,confirmed,checkout = dates
sql(rf"""begin; set local role authenticated; select set_config('request.jwt.claim.sub','{owner_id}',true);
select public.save_calendar_rate_draft('WHOLE_HOME_3BR',(select published_revision_id from public.calendar_rate_heads where package_code='WHOLE_HOME_3BR'),
jsonb_build_array(jsonb_build_object('kind','RANGE','amount_centavos',11000,'weekday',null,'start_date','{d1}','end_date','{d3}'),
jsonb_build_object('kind','DATE','amount_centavos',22000,'weekday',null,'start_date','{d2}','end_date','{d3}')), '{uuid.uuid4()}') as rev \gset
select public.publish_calendar_rate_revision(:'rev',(select base_revision_id from public.calendar_rate_revisions where id=:'rev'),'{uuid.uuid4()}');
-- An explicitly published empty 2BR revision supplies the missing-rate fixture;
-- earlier concurrency tests may have published a synthetic 2BR default.
select public.save_calendar_rate_draft('WHOLE_HOME_2BR',(select published_revision_id from public.calendar_rate_heads where package_code='WHOLE_HOME_2BR'),
'[]'::jsonb,'{uuid.uuid4()}') as missing_revision \gset
select public.publish_calendar_rate_revision(:'missing_revision',(select base_revision_id from public.calendar_rate_revisions where id=:'missing_revision'),'{uuid.uuid4()}');
select public.create_booking_owner_block('{blocked}','{confirmed}','{uuid.uuid4()}');
insert into public.booking_requests(source,package_code,check_in_date,check_out_date,overnight_guest_count)
values('PHONE','WHOLE_HOME_1BR','{confirmed}','{checkout}',1) returning id as r \gset
update public.booking_requests set status='REVIEWING' where id=:'r';
insert into public.booking_quotes(request_id,revision,amount_total,required_deposit_amount) values(:'r',1,100,25) returning id as q \gset
select public.issue_booking_quote(:'q');
update public.booking_requests set status='AWAITING_DEPOSIT' where id=:'r';
insert into public.booking_deposits(request_id,amount) values(:'r',25) returning id as d \gset
select public.decide_booking_deposit(:'d','VERIFIED',true,'{uuid.uuid4()}');
select public.confirm_booking_reservation(:'r',:'q','{uuid.uuid4()}'); commit;""")
with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as file:
    for name, value in env.items():
        if "KEY" in name or "PASSWORD" in name:
            print(f"::add-mask::{value}")
        file.write(f"{name}={value}\n")
print("Synthetic OWNER/MANAGER accounts and itemized quotation provisioned in local CI stack")
