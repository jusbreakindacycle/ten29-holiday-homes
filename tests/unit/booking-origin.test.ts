import { describe, expect, it } from "vitest";
import { isBookingSameOrigin } from "@/lib/booking-origin";
describe("public intake origin boundary", () => {
  const req = (origin: string, host: string) => new Request("http://localhost:3000/api/booking-request", { headers: { Origin: origin, Host: host } });
  it("accepts actual same-host browser requests despite an internal Next hostname", () => {
    expect(isBookingSameOrigin(req("http://127.0.0.1:3000", "127.0.0.1:3000"))).toBe(true);
    expect(isBookingSameOrigin(req("https://example.invalid", "example.invalid:443"))).toBe(true);
  });
  it("rejects cross-origin, null, malformed and credentialed origin values", () => {
    for (const origin of ["https://evil.invalid", "null", "invalid", "ftp://example.invalid", "https://user@example.invalid", "https://example.invalid/path"])
      expect(isBookingSameOrigin(req(origin,"example.invalid"))).toBe(false);
    expect(isBookingSameOrigin(new Request("http://localhost:3000"))).toBe(false);
  });
});
