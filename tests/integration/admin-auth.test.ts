import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateSupabaseServerClient } = vi.hoisted(() => ({
  mockCreateSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mockCreateSupabaseServerClient }));

import { getAdminUser, resolveAdminUser } from "@/lib/supabase/get-admin-user";

const FAKE_USER = { id: "user-1", email: "owner@ten29holidayhomes.com" } as never;

describe("resolveAdminUser", () => {
  it("returns null when there is no user (unauthenticated request)", () => {
    expect(resolveAdminUser({ data: { user: null }, error: null }, true)).toBeNull();
  });

  it("returns null when Supabase returns an auth error, even if a stale user is present", () => {
    expect(resolveAdminUser({ data: { user: FAKE_USER }, error: new Error("invalid session") }, true)).toBeNull();
  });

  it("returns the user when authenticated and explicitly authorized as a TEN29 admin", () => {
    expect(resolveAdminUser({ data: { user: FAKE_USER }, error: null }, true)).toBe(FAKE_USER);
  });

  it("rejects an authenticated account without TEN29 admin membership", () => {
    expect(resolveAdminUser({ data: { user: FAKE_USER }, error: null }, false)).toBeNull();
  });
});

describe("getAdminUser", () => {
  beforeEach(() => mockCreateSupabaseServerClient.mockReset());

  it("checks explicit TEN29 membership after authenticating", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: FAKE_USER }, error: null }) },
      rpc,
    });

    await expect(getAdminUser()).resolves.toBe(FAKE_USER);
    expect(rpc).toHaveBeenCalledWith("is_ten29_admin");
  });

  it("fails closed when membership is denied or the membership check errors", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: FAKE_USER }, error: null }) },
      rpc,
    });

    await expect(getAdminUser()).resolves.toBeNull();

    rpc.mockResolvedValue({ data: null, error: new Error("membership check unavailable") });
    await expect(getAdminUser()).resolves.toBeNull();
  });

  it("does not query membership for an unauthenticated request", async () => {
    const rpc = vi.fn();
    mockCreateSupabaseServerClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      rpc,
    });

    await expect(getAdminUser()).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
