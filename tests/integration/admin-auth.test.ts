import { describe, expect, it } from "vitest";
import { resolveAdminUser } from "@/lib/supabase/get-admin-user";

const FAKE_USER = { id: "user-1", email: "owner@ten29holidayhomes.com" } as never;

describe("resolveAdminUser", () => {
  it("returns null when there is no user (unauthenticated request)", () => {
    expect(resolveAdminUser({ data: { user: null }, error: null })).toBeNull();
  });

  it("returns null when Supabase returns an auth error, even if a stale user is present", () => {
    expect(resolveAdminUser({ data: { user: FAKE_USER }, error: new Error("invalid session") })).toBeNull();
  });

  it("returns the user when authenticated with no error", () => {
    expect(resolveAdminUser({ data: { user: FAKE_USER }, error: null })).toBe(FAKE_USER);
  });
});
