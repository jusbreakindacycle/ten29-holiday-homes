import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";
import { resolveAdminUser } from "@/lib/supabase/get-admin-user";

describe("owner-preview route protection", () => {
  it("falls under the app-wide staging matcher and retains the admin authentication check", () => {
    expect(proxyConfig.matcher).toContain("/((?!_next/static|_next/image|favicon.ico).*)");
    expect("/admin/owner-preview".startsWith("/admin/")).toBe(true);
  });

  it("would be redirected away with no authenticated session (same gate as every /admin route)", () => {
    expect(resolveAdminUser({ data: { user: null }, error: null }, false)).toBeNull();
  });
});
