import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl, getPhoneDisplay, getPhoneE164 } from "@/lib/site-config";

describe("getSiteUrl", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original;
    vi.resetModules();
  });

  it("defaults to localhost when unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("resolves from the environment variable", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.ten29holidayhomes.com";
    expect(getSiteUrl()).toBe("https://www.ten29holidayhomes.com");
  });

  it("strips a trailing slash for canonical consistency", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.ten29holidayhomes.com/";
    expect(getSiteUrl()).toBe("https://www.ten29holidayhomes.com");
  });
});

describe("verified business claims", () => {
  it("exposes the approved phone display and E.164 formats", () => {
    expect(getPhoneDisplay()).toBe("0961 586 8106");
    expect(getPhoneE164()).toBe("+639615868106");
  });
});
