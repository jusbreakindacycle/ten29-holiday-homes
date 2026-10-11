import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetAdminUser,
  mockRedirect,
  mockCreateSupabaseServerClient,
  mockUpdateInquiryNotes,
  mockUpdateInquiryStatus,
} = vi.hoisted(() => ({
  mockGetAdminUser: vi.fn(),
  mockRedirect: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
  mockCreateSupabaseServerClient: vi.fn(),
  mockUpdateInquiryNotes: vi.fn(),
  mockUpdateInquiryStatus: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/lib/supabase/get-admin-user", () => ({ getAdminUser: mockGetAdminUser }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mockCreateSupabaseServerClient }));
vi.mock("@/services/inquiry-service", () => ({
  updateInquiryNotes: mockUpdateInquiryNotes,
  updateInquiryStatus: mockUpdateInquiryStatus,
  InquiryServiceError: class InquiryServiceError extends Error {},
}));

import { updateInquiryNotesAction } from "@/app/admin/(protected)/actions";

describe("admin server-action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminUser.mockResolvedValue(null);
    mockCreateSupabaseServerClient.mockResolvedValue({});
    mockUpdateInquiryNotes.mockResolvedValue({});
  });

  it("redirects unauthenticated and unauthorized requests before reading or mutating inquiries", async () => {
    const formData = new FormData();
    formData.set("id", "inquiry-1");
    formData.set("owner_notes", "unauthorized edit");

    await expect(updateInquiryNotesAction({ status: "idle" }, formData)).rejects.toThrow("REDIRECT:/admin/login");

    expect(mockUpdateInquiryNotes).not.toHaveBeenCalled();
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("allows the server action for a user returned by the TEN29 admin guard", async () => {
    mockGetAdminUser.mockResolvedValue({ id: "admin-1", email: "admin@example.test" });
    const formData = new FormData();
    formData.set("id", "inquiry-1");
    formData.set("owner_notes", "verified owner follow-up");

    const result = await updateInquiryNotesAction({ status: "idle" }, formData);

    expect(result).toEqual({ status: "success", message: "Notes saved." });
    expect(mockUpdateInquiryNotes).toHaveBeenCalledWith({}, "inquiry-1", "verified owner follow-up", "admin@example.test");
  });
});