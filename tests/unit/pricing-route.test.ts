import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/pricing/route';
import { POST } from '@/app/api/pricing/revalidate/route';

describe('public pricing route', () => {
  it('does not expose the private standard rate schedule or revalidation snapshots', async () => {
    const response = await GET(new Request('http://local.test/api/pricing?package_code=WHOLE_HOME_1BR'));
    const revalidation = await POST(new Request('http://local.test/api/pricing/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selection: {}, expected_version: null }),
    }));

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(await response.json()).toEqual({
      error: 'Standard rates are not publicly available. Request an owner quotation.',
    });
    expect(revalidation.status).toBe(404);
    expect(revalidation.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(await revalidation.json()).toEqual({
      error: 'Standard rates are not publicly available. Request an owner quotation.',
    });
  });
});
