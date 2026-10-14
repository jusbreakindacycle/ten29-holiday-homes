import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(process.cwd(), 'scripts/check-staging-env.mjs');
const valid = {
  TEN29_ENVIRONMENT: 'staging',
  TEN29_STAGING_ACCESS_USER: 'reviewer',
  TEN29_STAGING_ACCESS_PASSWORD: 'a-long-staging-access-password-for-tests',
  NEXT_PUBLIC_SITE_URL: 'https://stage.example.test',
  TEN29_STAGING_SUPABASE_PROJECT_REF: 'project-ref',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project-ref.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'private-key',
  RESEND_API_KEY: 're_test_fake',
  INQUIRY_NOTIFICATION_TO: 'sink@example.invalid',
  INQUIRY_FROM_EMAIL: 'TEN29 Staging <staging@example.invalid>',
};

function run(overrides: Record<string, string | undefined> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, ...valid, ...overrides };
  for (const [key, value] of Object.entries(overrides)) if (value === undefined) delete env[key];
  return spawnSync(process.execPath, [script], { encoding: 'utf8', env });
}

describe('staging environment checks', () => {
  it('accepts an isolated HTTPS staging shape and reports remaining provider checks', () => {
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('still require provider-side verification');
  });

  it('rejects production email keys and non-sink recipients without printing values', () => {
    const result = run({ RESEND_API_KEY: 're_live_secret-value', INQUIRY_NOTIFICATION_TO: 'guest@example.com' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Resend test-mode key');
    expect(result.stderr).toContain('example.invalid sink');
    expect(result.stderr).not.toContain('secret-value');
  });

  it('rejects local or insecure endpoints and short access passwords', () => {
    const result = run({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000', TEN29_STAGING_ACCESS_PASSWORD: 'short' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('HTTPS hosted endpoint');
    expect(result.stderr).toContain('at least 24 characters');
  });
});
