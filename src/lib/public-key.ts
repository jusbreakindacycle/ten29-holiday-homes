/** Reject privileged Supabase credentials before constructing a public client. */
export function isPrivilegedPublicKey(value: string | undefined): boolean {
  if (!value) return false;
  if (value.startsWith('sb_secret_')) return true;
  try { return JSON.parse(atob(value.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))).role === 'service_role'; }
  catch { return false; }
}
