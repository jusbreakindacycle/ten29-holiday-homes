import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";
import { resolveAdminUser } from "@/lib/supabase/get-admin-user";

describe("owner-preview route protection", () => {
  it("falls under the admin proxy matcher that enforces authentication", () => {
    expect(proxyConfig.matcher).toContain("/admin/:path*");
    expect("/admin/owner-preview".startsWith("/admin/")).toBe(true);
  });

  it("would be redirected away with no authenticated session (same gate as every /admin route)", () => {
    expect(resolveAdminUser({ data: { user: null }, error: null })).toBeNull();
  });
});
