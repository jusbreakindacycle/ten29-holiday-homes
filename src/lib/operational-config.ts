/** Returns names and safe remedies only; never credential values. */
export function operationalConfigIssues(env: Record<string, string | undefined>): string[] {
  const issues: string[] = [];
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SITE_URL', 'RESEND_API_KEY', 'INQUIRY_NOTIFICATION_TO', 'INQUIRY_FROM_EMAIL']) {
    if (!env[name]?.trim()) issues.push(`${name}: required for operational readiness`);
  }
  for (const name of ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    if (!env[name]) continue;
    try {
      const url = new URL(env[name]!);
      if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw Error();
      if (env.TEN29_PROVIDER_E2E === 'true') {
        if (name === 'NEXT_PUBLIC_SUPABASE_URL' && url.origin !== 'http://127.0.0.1:54321') throw Error();
        if (name === 'NEXT_PUBLIC_SITE_URL' && !['127.0.0.1', 'localhost'].includes(url.hostname)) throw Error();
      } else if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw Error();
    } catch { issues.push(`${name}: invalid or unsafe endpoint`); }
  }
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY === env.SUPABASE_SERVICE_ROLE_KEY)
    issues.push('Supabase credentials: public and privileged keys must differ');
  for (const [name, value] of Object.entries(env)) {
    if (value && name.startsWith('NEXT_PUBLIC_') && /SERVICE_ROLE|SECRET|PASSWORD|RESEND_API|PRIVATE_KEY/.test(name))
      issues.push(`${name}: credential must never be browser-public`);
  }
  return issues;
}
