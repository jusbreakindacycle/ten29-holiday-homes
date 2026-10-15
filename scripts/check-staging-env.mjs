const required = [
  'TEN29_ENVIRONMENT',
  'TEN29_STAGING_ACCESS_USER',
  'TEN29_STAGING_ACCESS_PASSWORD',
  'NEXT_PUBLIC_SITE_URL',
  'TEN29_STAGING_SUPABASE_PROJECT_REF',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'INQUIRY_NOTIFICATION_TO',
  'INQUIRY_FROM_EMAIL',
];
const issues = [];
const env = process.env;

function isPlaceholder(value) {
  return /(?:placeholder|replace[-_ ]?with|your[-_ ]|example\.(?:com|org|test|invalid)|project[-_ ]?ref|dummy|fake|change[-_ ]?me|generate[-_ ])/i.test(value);
}
function jwtRole(value) {
  try {
    const segment = value.split('.')[1];
    if (!segment) return undefined;
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')).role;
  } catch { return undefined; }
}
function isPublicSupabaseKey(value) {
  return value.startsWith('sb_publishable_') || jwtRole(value) === 'anon';
}
function isServiceSupabaseKey(value) {
  return value.startsWith('sb_secret_') || jwtRole(value) === 'service_role';
}
for (const name of required) {
  const value = env[name]?.trim();
  if (!value) issues.push(`${name} is required`);
  else if (!['INQUIRY_NOTIFICATION_TO', 'INQUIRY_FROM_EMAIL'].includes(name) && isPlaceholder(value))
    issues.push(`${name} contains a placeholder value`);
}
if (env.TEN29_ENVIRONMENT && env.TEN29_ENVIRONMENT !== 'staging') issues.push('TEN29_ENVIRONMENT must equal staging');
if (env.TEN29_STAGING_ACCESS_PASSWORD && env.TEN29_STAGING_ACCESS_PASSWORD.length < 24)
  issues.push('TEN29_STAGING_ACCESS_PASSWORD must contain at least 24 characters');
for (const name of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
  const value = env[name];
  if (!value) continue;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      /(?:^|\.)(?:invalid|test|example|localhost)$/i.test(url.hostname)) throw Error();
  } catch { issues.push(`${name} must be a non-placeholder HTTPS hosted endpoint without credentials`); }
}
if (env.NEXT_PUBLIC_SITE_URL && env.NEXT_PUBLIC_SITE_URL === env.NEXT_PUBLIC_SUPABASE_URL)
  issues.push('Application and Supabase endpoints must be separate');
if (env.TEN29_STAGING_SUPABASE_PROJECT_REF && env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const ref = env.TEN29_STAGING_SUPABASE_PROJECT_REF;
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    if (!/^[a-z0-9-]{8,64}$/.test(ref) || url.hostname !== `${ref}.supabase.co`)
      issues.push('Supabase URL does not match the explicitly selected staging project ref');
  } catch { /* Endpoint validation above reports malformed URLs. */ }
}
if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !isPublicSupabaseKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
  issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a Supabase publishable key or anon JWT');
if (env.SUPABASE_SERVICE_ROLE_KEY && !isServiceSupabaseKey(env.SUPABASE_SERVICE_ROLE_KEY))
  issues.push('SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key or service_role JWT');
if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY)
  issues.push('Public and privileged Supabase credentials must differ');
if (env.RESEND_API_KEY && (!env.RESEND_API_KEY.startsWith('re_test_') || env.RESEND_API_KEY.length < 16 || isPlaceholder(env.RESEND_API_KEY)))
  issues.push('Staging email requires a non-placeholder Resend test-mode key');
if (env.INQUIRY_NOTIFICATION_TO && !/^[^\s@<>]+@example\.invalid$/i.test(env.INQUIRY_NOTIFICATION_TO.trim()))
  issues.push('Staging notifications must route to an example.invalid sink');
const senderAddress = env.INQUIRY_FROM_EMAIL?.match(/<?([^\s<>@]+@[^\s<>@]+)>?$/)?.[1];
if (env.INQUIRY_FROM_EMAIL && (!senderAddress || !/^[^\s@<>]+@example\.invalid$/i.test(senderAddress)))
  issues.push('Staging sender must use an example.invalid address');
for (const name of Object.keys(env)) {
  if (env[name] && name.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|SECRET|PASSWORD|RESEND_API|PRIVATE_KEY/.test(name))
    issues.push(`${name} must not expose a credential in the browser`);
}
if (issues.length) {
  console.error(`Staging configuration rejected (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n- ${issues.join('\n- ')}`);
  process.exit(1);
}
console.log('Staging environment shape checks passed. Endpoint ownership, project isolation, host access controls, account settings, and secrets still require provider-side verification.');
