import { beforeEach, describe, expect, it, vi } from "vitest";
const { createClient, readPromotion, operationalLog } = vi.hoisted(() => ({ createClient: vi.fn(), readPromotion: vi.fn(), operationalLog: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: createClient }));
vi.mock("@/services/pricing-service", () => ({ readPublicPromotionTeaser: readPromotion, PricingError: class PricingError extends Error {
  constructor(message: string, readonly providerCode?: string) { super(message); }
} }));
vi.mock("@/lib/operational-log", () => ({ operationalLog }));
import { GET } from "@/app/api/promotion-teaser/route";
import { PricingError } from "@/services/pricing-service";

const valid = "package_code=WHOLE_HOME_2BR&check_in_date=2033-01-10&check_out_date=2033-01-12";
describe("public promotion teaser projection", () => {
  beforeEach(() => { vi.clearAllMocks(); createClient.mockResolvedValue({}); });
  it("returns only approved package-specific per-night teaser fields", async () => {
    readPromotion.mockResolvedValue({ package_code: "WHOLE_HOME_2BR", former_amount_centavos: 50000,
      promotional_amount_centavos: 40000, minimum_nights: 2, maximum_nights: 7, price_basis: "PER_NIGHT" });
    const response = await GET(new Request(`http://local.test/api/promotion-teaser?${valid}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ promotion: { package_code: "WHOLE_HOME_2BR", former_amount_centavos: 50000,
      promotional_amount_centavos: 40000, minimum_nights: 2, maximum_nights: 7, price_basis: "PER_NIGHT" } });
    expect(JSON.stringify(body)).not.toMatch(/standard|rules|history|guest|payment|adjustment/i);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("returns no promotion when none is configured and rejects malformed selections", async () => {
    readPromotion.mockResolvedValue(null);
    const response = await GET(new Request(`http://local.test/api/promotion-teaser?${valid}`));
    expect(await response.json()).toEqual({ promotion: null });
    const invalid = await GET(new Request("http://local.test/api/promotion-teaser?package_code=WHOLE_HOME_2BR&check_in_date=2033-02-30&check_out_date=2033-03-02"));
    expect(invalid.status).toBe(400); expect(readPromotion).toHaveBeenCalledTimes(1);
  });
  it("does not leak database errors or partial data", async () => {
    readPromotion.mockRejectedValue(new Error("private rate schedule and provider detail"));
    const response = await GET(new Request(`http://local.test/api/promotion-teaser?${valid}`));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Promotion details are unavailable. Request a formal quotation." });
  });
  it("records a sanitized provider code for pricing RPC failures", async () => {
    readPromotion.mockRejectedValue(new PricingError("private database detail", "PGRST202"));
    const response = await GET(new Request(`http://local.test/api/promotion-teaser?${valid}`));
    expect(response.status).toBe(503);
    expect(operationalLog).toHaveBeenCalledWith("promotion_teaser_failed", { stage: "pricing", providerCode: "PGRST202" });
    expect(await response.text()).not.toContain("PGRST202");
  });
});
