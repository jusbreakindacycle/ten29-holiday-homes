import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = path.resolve(process.cwd(), 'scripts/check-staging-env.mjs');
const makeJwt = (role: string) => `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature-for-tests`;
const valid = {
  TEN29_ENVIRONMENT: 'staging',
  TEN29_STAGING_ACCESS_USER: 'reviewer',
  TEN29_STAGING_ACCESS_PASSWORD: 'a-long-staging-access-password-for-tests',
  NEXT_PUBLIC_SITE_URL: 'https://stage.ten29homes.com',
  TEN29_STAGING_SUPABASE_PROJECT_REF: 'ten29staging12345678',
  NEXT_PUBLIC_SUPABASE_URL: 'https://ten29staging12345678.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: makeJwt('anon'),
  SUPABASE_SERVICE_ROLE_KEY: makeJwt('service_role'),
  RESEND_API_KEY: 're_test_fixture_key_1234567890',
  INQUIRY_NOTIFICATION_TO: 'sink@example.invalid',
  INQUIRY_FROM_EMAIL: 'TEN29 Staging <staging@example.invalid>',
};

function run(overrides: Record<string, string | undefined> = {}) {
  const env: NodeJS.ProcessEnv = { ...process.env, ...valid, ...overrides };
  for (const [key, value] of Object.entries(overrides)) if (value === undefined) delete env[key];
  return spawnSync(process.execPath, [script], { encoding: 'utf8', env });
}

describe('staging environment checks', () => {
  it('keeps the tracked local template free of credential-looking values', () => {
    const template = readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
    expect(template).toContain('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321');
    expect(template).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=REPLACE_WITH_');
    expect(template).toContain('SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_');
    expect(template).not.toMatch(/(?:^|=)eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./m);
    expect(template).not.toMatch(/(?:^|=)sb_secret_[A-Za-z0-9_-]+/m);
    expect(template).not.toMatch(/(?:^|=)re_[A-Za-z0-9_-]+/m);
  });

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

  it('rejects unmistakable sample values and malformed Supabase credential roles without echoing values', () => {
    const result = run({
      TEN29_STAGING_SUPABASE_PROJECT_REF: 'staging-project-ref',
      NEXT_PUBLIC_SUPABASE_URL: 'https://staging-project-ref.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'REPLACE_WITH_STAGING_ANON_KEY',
      SUPABASE_SERVICE_ROLE_KEY: makeJwt('anon'),
      RESEND_API_KEY: 're_test_replace-me',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('contains a placeholder value');
    expect(result.stderr).toContain('must be a Supabase publishable key or anon JWT');
    expect(result.stderr).toContain('must be a Supabase secret key or service_role JWT');
    expect(result.stderr).not.toContain('REPLACE_WITH_STAGING_ANON_KEY');
    expect(result.stderr).not.toContain('re_test_replace-me');
  });
});
