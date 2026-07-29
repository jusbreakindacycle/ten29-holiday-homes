import { describe, expect, it } from "vitest";
import { ENQUIRY_SUCCESS_COPY, FALLBACK_COPY, NON_RESERVATION_NOTICE } from "@/content/fallback-copy";
import { getFaqItems } from "@/content/faq";
import { getAllClaims, getPublicClaims } from "@/content/claims";

const BANNED_PHRASES = [
  "booking confirmed",
  "date reserved",
  "reservation confirmed",
  "always available",
  "always open",
  "instant confirmation",
  "instant booking",
  "secure payment",
  "best staycation",
  "number one",
  "luxury",
  "near all tagaytay attractions",
  "minutes away",
  "tagaytay accommodation",
  "guest favorite",
  "safe and secure",
  "rare quiet environment",
  "book now",
  "netflix subscription included",
  "netflix account included",
];

// Checked separately with a negative lookbehind: truthful copy is allowed to say
// "TEN29 is *not* located in Tagaytay" — only an unnegated claim is prohibited.
const UNNEGATED_LOCATION_CLAIM = /(?<!not )located in tagaytay/;

function collectAllPublicCopy(): string[] {
  const strings: string[] = [
    ...Object.values(FALLBACK_COPY),
    NON_RESERVATION_NOTICE,
    ENQUIRY_SUCCESS_COPY.heading,
    ENQUIRY_SUCCESS_COPY.body,
    ENQUIRY_SUCCESS_COPY.reminder,
  ];

  for (const item of getFaqItems()) {
    strings.push(item.question, item.answer);
  }

  for (const claim of getPublicClaims()) {
    if (typeof claim.value === "string") strings.push(claim.value);
    if (Array.isArray(claim.value)) strings.push(...claim.value);
    if (claim.notes) strings.push(claim.notes);
  }

  return strings;
}

describe("public copy never uses prohibited language", () => {
  const allCopy = collectAllPublicCopy().join(" \n ").toLowerCase();

  it.each(BANNED_PHRASES)('does not contain "%s"', (phrase) => {
    expect(allCopy.includes(phrase)).toBe(false);
  });

  it('never states TEN29 is located in Tagaytay (negated statements are allowed)', () => {
    expect(UNNEGATED_LOCATION_CLAIM.test(allCopy)).toBe(false);
  });
});

describe("enquiry success copy never implies a confirmed booking", () => {
  it("does not say the stay is confirmed or reserved", () => {
    const combined = `${ENQUIRY_SUCCESS_COPY.heading} ${ENQUIRY_SUCCESS_COPY.body}`.toLowerCase();
    expect(combined).not.toContain("confirmed");
    expect(combined).not.toContain("reserved");
  });

  it("explicitly says this is a request, not a reservation", () => {
    expect(ENQUIRY_SUCCESS_COPY.body.toLowerCase()).toContain("not a reservation");
  });
});

describe("no fake review or rating content exists in claim fixtures", () => {
  it("has no claim category or label referencing ratings/reviews/testimonials", () => {
    const suspicious = getAllClaims().filter((claim) =>
      /rating|review|testimonial/i.test(`${claim.category} ${claim.label}`)
    );
    expect(suspicious).toEqual([]);
  });
});
