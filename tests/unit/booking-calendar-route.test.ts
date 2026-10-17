import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, readPrices, log } = vi.hoisted(() => ({
  createClient: vi.fn(),
  readPrices: vi.fn(),
  log: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createClient }));
vi.mock('@/services/pricing-service', () => ({ readPublicPrices: readPrices }));
vi.mock('@/lib/operational-log', () => ({ operationalLog: log }));

import { GET } from '@/app/api/booking-calendar/route';

const query = new URLSearchParams({
  package_code: 'WHOLE_HOME_1BR',
  overnight_guest_count: '1',
  folding_foams_requested: 'false',
  check_in_date: '2030-05-01',
  check_out_date: '2030-05-03',
});
const estimate = {
  package_code: 'WHOLE_HOME_1BR', overnight_guest_count: 1, folding_foams_requested: false,
  check_in_date: '2030-05-01', check_out_date: '2030-05-03', bedrooms_opened: 1,
  private_whole_house: true, currency: 'PHP', estimate_kind: 'ACCOMMODATION_ONLY', version: null,
  missing_rates: true, accommodation_subtotal_centavos: null, estimated_total_centavos: null, nights: [],
};

describe('booking calendar diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readPrices.mockResolvedValue(estimate);
    createClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: [], error: null }) });
  });

  it('returns availability and a quote-required estimate without inventing prices', async () => {
    const response = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ estimate: { missing_rates: true, estimated_total_centavos: null }, unavailable: [] });
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

  it('distinguishes missing configuration and pricing failure without exposing exception messages', async () => {
    createClient.mockRejectedValueOnce(new Error('NEXT_PUBLIC_SUPABASE_URL must not be echoed with secret material'));
    const configuration = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(await configuration.json()).toMatchObject({ diagnostic_code: 'CALENDAR_CONFIGURATION' });
    expect(log).toHaveBeenLastCalledWith('booking_calendar_failed', { stage: 'configuration' });

    createClient.mockResolvedValue({ rpc: vi.fn() });
    readPrices.mockRejectedValueOnce(new Error('private pricing provider message'));
    const pricing = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(await pricing.json()).toMatchObject({ diagnostic_code: 'PRICING_UNAVAILABLE' });
    expect(log).toHaveBeenLastCalledWith('booking_calendar_failed', { stage: 'pricing' });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret material|private pricing provider message/);
  });

  it('rejects malformed availability responses rather than treating them as empty availability', async () => {
    createClient.mockResolvedValue({ rpc: vi.fn().mockResolvedValue({ data: [{ check_in_date: null }], error: null }) });
    const response = await GET(new Request(`http://local.test/api/booking-calendar?${query}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ diagnostic_code: 'CALENDAR_RESPONSE_INVALID' });
    expect(log).toHaveBeenCalledWith('booking_calendar_failed', { stage: 'response' });
  });
});
