import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, log } = vi.hoisted(() => ({
  createClient: vi.fn(),
  log: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createClient }));
vi.mock('@/lib/operational-log', () => ({ operationalLog: log }));

import { GET } from '@/app/api/booking-calendar/route';

const query = new URLSearchParams({
  package_code: 'WHOLE_HOME_1BR',
  overnight_guest_count: '1',
  folding_foams_requested: 'false',
  check_in_date: '2030-05-01',
  check_out_date: '2030-05-03',
});
describe('booking calendar diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: [], error: null }) });
  });

  it('returns coarse availability without exposing standard rates', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    createClient.mockResolvedValue({ rpc });
    const response = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ unavailable: [] });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('read_booking_availability', {
      p_check_in: '2030-05-01', p_check_out: '2030-05-03',
    });
    expect(log).not.toHaveBeenCalled();
  });

  it('identifies an availability RPC failure with a safe stage and provider code', async () => {
    createClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { code: '42883', message: 'sensitive provider details' } }) });
    const response = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ diagnostic_code: 'AVAILABILITY_UNAVAILABLE' });
    expect(log).toHaveBeenCalledWith('booking_calendar_failed', { stage: 'availability', providerCode: '42883' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive provider details');
  });

  it('identifies missing configuration without exposing exception messages', async () => {
    createClient.mockRejectedValueOnce(new Error('NEXT_PUBLIC_SUPABASE_URL must not be echoed with secret material'));
    const configuration = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(await configuration.json()).toMatchObject({ diagnostic_code: 'CALENDAR_CONFIGURATION' });
    expect(log).toHaveBeenLastCalledWith('booking_calendar_failed', { stage: 'configuration' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret material');
  });

  it('rejects malformed availability responses rather than treating them as empty availability', async () => {
    createClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: [{ check_in_date: null }], error: null }) });
    const response = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ diagnostic_code: 'CALENDAR_RESPONSE_INVALID' });
    expect(log).toHaveBeenCalledWith('booking_calendar_failed', { stage: 'response' });
  });
});
