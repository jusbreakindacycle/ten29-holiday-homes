import { afterEach, describe, expect, it, vi } from 'vitest';
import { operationalConfigIssues } from '@/lib/operational-config';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';
import { operationalLog } from '@/lib/operational-log';
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('operational configuration and privacy', () => {
  it('returns names without echoing credential contents', () => {
    const result = operationalConfigIssues({ NEXT_PUBLIC_SERVICE_ROLE_KEY: 'private-synthetic-value', NEXT_PUBLIC_SITE_URL: 'https://user:secret@example.invalid' });
    expect(result.join()).toContain('credential must never'); expect(result.join()).not.toContain('private-synthetic-value'); expect(result.join()).not.toContain('user:secret');
  });
  it('flags missing operational settings without preventing a credential-free build', () => {
    expect(operationalConfigIssues({})).toHaveLength(7);
  });
  it('requires HTTPS for production and rejects hosted provider-test endpoints', () => {
    expect(operationalConfigIssues({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://example.invalid' })).toContain('NEXT_PUBLIC_SITE_URL: invalid or unsafe endpoint');
    vi.stubEnv('TEN29_PROVIDER_E2E', 'true'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    expect(() => getSupabaseUrl()).toThrow('isolated localhost');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321'); expect(getSupabaseUrl()).toBe('http://127.0.0.1:54321');
  });
  it('rejects sharing privileged credentials with the public client', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'same'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'same');
    expect(() => getSupabaseServiceRoleKey()).toThrow('must differ');
  });
  it('detects a privileged key mislabelled as the anonymous public key', () => {
    const jwt = 'header.' + btoa(JSON.stringify({ role: 'service_role' })) + '.signature';
    for (const key of [jwt, 'sb_secret_synthetic']) expect(operationalConfigIssues({ NEXT_PUBLIC_SUPABASE_ANON_KEY: key })).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY: privileged credential is forbidden');
  });
  it('logs only a fixed event and timestamp', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {}); operationalLog('notification_finish_failed');
    expect(Object.keys(JSON.parse(log.mock.calls[0][0]))).toEqual(['event', 'at']);
  });
});
