import { describe, expect, it } from "vitest";
import { inquiryFormSchema, isLikelySpam } from "@/lib/validation/inquiry-schema";

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    full_name: "Maria Santos",
    email: "maria@example.com",
    mobile_number: "+639171234567",
    check_in_date: futureDate(10),
    check_out_date: futureDate(12),
    adults: 4,
    children: 1,
    day_visitors: 0,
    vehicles: 1,
    purpose_of_stay: "Family reunion",
    message: "Looking forward to it",
    privacy_consent: true,
    source: "website",
    ...overrides,
  };
}

describe("inquiryFormSchema", () => {
  it("accepts a valid enquiry", () => {
    const result = inquiryFormSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("rejects a missing full name", () => {
    const result = inquiryFormSchema.safeParse(validPayload({ full_name: "A" }));
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email when supplied", () => {
    const result = inquiryFormSchema.safeParse(validPayload({ email: "not-an-email" }));
    expect(result.success).toBe(false);
  });

  it("allows an empty email (optional field)", () => {
    const result = inquiryFormSchema.safeParse(validPayload({ email: "" }));
    expect(result.success).toBe(true);
  });

  it("rejects check-out on or before check-in", () => {
    const sameDay = futureDate(10);
    const result = inquiryFormSchema.safeParse(
      validPayload({ check_in_date: sameDay, check_out_date: sameDay })
    );
    expect(result.success).toBe(false);
  });

  it("rejects a check-in date in the past", () => {
    const result = inquiryFormSchema.safeParse(
      validPayload({ check_in_date: futureDate(-5), check_out_date: futureDate(-3) })
    );
    expect(result.success).toBe(false);
  });

  it("rejects dates beyond the maximum booking window", () => {
    const result = inquiryFormSchema.safeParse(
      validPayload({ check_in_date: futureDate(700), check_out_date: futureDate(702) })
    );
    expect(result.success).toBe(false);
  });

  it("rejects zero or negative adults", () => {
    const result = inquiryFormSchema.safeParse(validPayload({ adults: 0 }));
    expect(result.success).toBe(false);
  });

  it("rejects a negative child count", () => {
    const result = inquiryFormSchema.safeParse(validPayload({ children: -1 }));
    expect(result.success).toBe(false);
  });

  it("requires privacy consent to be true", () => {
    const result = inquiryFormSchema.safeParse(validPayload({ privacy_consent: false }));
    expect(result.success).toBe(false);
  });

  it("captures UTM/source values safely", () => {
    const result = inquiryFormSchema.safeParse(
      validPayload({ source: "facebook", utm_source: "fb", utm_medium: "messenger", utm_campaign: "launch" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.utm_source).toBe("fb");
    }
  });

  it("caps oversized UTM values instead of accepting arbitrary length", () => {
    const result = inquiryFormSchema.safeParse(
      validPayload({ utm_campaign: "x".repeat(500) })
    );
    expect(result.success).toBe(false);
  });
});

describe("isLikelySpam", () => {
  it("flags a filled honeypot field", () => {
    expect(isLikelySpam({ website: "http://spam.example" })).toBe(true);
  });

  it("does not flag an empty honeypot field", () => {
    expect(isLikelySpam({ website: "" })).toBe(false);
  });

  it("flags a submission that completes implausibly fast", () => {
    expect(isLikelySpam({ form_rendered_at: Date.now() - 100 })).toBe(true);
  });

  it("does not flag a submission with a plausible fill time", () => {
    expect(isLikelySpam({ form_rendered_at: Date.now() - 10_000 })).toBe(false);
  });
});
