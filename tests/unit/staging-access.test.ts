import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const original = { ...process.env };
const password = 'a-long-staging-access-password-for-tests';
const request = (authorization?: string) => new NextRequest('https://staging.example.test/admin', {
  headers: authorization ? { authorization } : undefined,
});

afterEach(() => {
  process.env = { ...original };
});

describe('staging access gate', () => {
  it('passes through outside staging', async () => {
    delete process.env.TEN29_ENVIRONMENT;
    expect((await proxy(request())).status).toBe(200);
  });

  it('fails closed when staging gate credentials are missing or weak', async () => {
    process.env.TEN29_ENVIRONMENT = 'staging';
    delete process.env.TEN29_STAGING_ACCESS_USER;
    process.env.TEN29_STAGING_ACCESS_PASSWORD = 'short';
    expect((await proxy(request())).status).toBe(503);
  });

  it('denies anonymous and invalid credentials without caching', async () => {
    process.env.TEN29_ENVIRONMENT = 'staging';
    process.env.TEN29_STAGING_ACCESS_USER = 'reviewer';
    process.env.TEN29_STAGING_ACCESS_PASSWORD = password;
    const denied = await proxy(request());
    expect(denied.status).toBe(401);
    expect(denied.headers.get('cache-control')).toBe('no-store');
    expect(denied.headers.get('x-robots-tag')).toContain('noindex');
    expect((await proxy(request(`Basic ${Buffer.from('reviewer:wrong').toString('base64')}`))).status).toBe(401);
  });

  it('allows staging credentials through to the existing OWNER authorization layer', async () => {
    process.env.TEN29_ENVIRONMENT = 'staging';
    process.env.TEN29_STAGING_ACCESS_USER = 'reviewer';
    process.env.TEN29_STAGING_ACCESS_PASSWORD = password;
    const response = await proxy(request(`Basic ${Buffer.from(`reviewer:${password}`).toString('base64')}`));
    expect(response.status).toBe(200);
  });
});
