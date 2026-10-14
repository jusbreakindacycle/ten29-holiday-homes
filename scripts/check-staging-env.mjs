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
for (const name of required) if (!process.env[name]?.trim()) issues.push(`${name} is required`);
if (process.env.TEN29_ENVIRONMENT !== 'staging') issues.push('TEN29_ENVIRONMENT must equal staging');
if (process.env.TEN29_STAGING_ACCESS_PASSWORD && process.env.TEN29_STAGING_ACCESS_PASSWORD.length < 24)
  issues.push('TEN29_STAGING_ACCESS_PASSWORD must contain at least 24 characters');
for (const name of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
  const value = process.env[name];
  if (!value) continue;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.hostname.endsWith('.invalid')) throw Error();
  } catch { issues.push(`${name} must be an HTTPS hosted endpoint without credentials`); }
}
if (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL === process.env.NEXT_PUBLIC_SUPABASE_URL)
  issues.push('Application and Supabase endpoints must be separate');
if (process.env.TEN29_STAGING_SUPABASE_PROJECT_REF && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const expectedHost = `${process.env.TEN29_STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
    if (new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname !== expectedHost)
      issues.push('Supabase URL does not match the explicitly selected staging project ref');
  } catch { /* Endpoint validation above reports malformed URLs. */ }
}
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === process.env.SUPABASE_SERVICE_ROLE_KEY)
  issues.push('Public and privileged Supabase credentials must differ');
if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_test_'))
  issues.push('Staging email requires a Resend test-mode key');
if (process.env.INQUIRY_NOTIFICATION_TO && !process.env.INQUIRY_NOTIFICATION_TO.toLowerCase().endsWith('@example.invalid'))
  issues.push('Staging notifications must route to an example.invalid sink');
for (const [name, value] of Object.entries(process.env)) {
  if (value && name.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|SECRET|PASSWORD|RESEND_API|PRIVATE_KEY/.test(name))
    issues.push(`${name} must not expose a credential in the browser`);
}
if (issues.length) {
  console.error(`Staging configuration rejected (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n- ${issues.join('\n- ')}`);
  process.exit(1);
}
console.log('Staging environment shape checks passed. Endpoint ownership, project isolation, host access controls, account settings, and secrets still require provider-side verification.');
