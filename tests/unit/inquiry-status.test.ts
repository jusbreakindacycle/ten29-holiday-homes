import { describe, expect, it } from "vitest";
import { isValidStatusTransition, INQUIRY_STATUSES } from "@/types/inquiry";

describe("isValidStatusTransition", () => {
  it("allows NEW to move to any active status", () => {
    expect(isValidStatusTransition("NEW", "REVIEWING")).toBe(true);
    expect(isValidStatusTransition("NEW", "CONTACTED")).toBe(true);
    expect(isValidStatusTransition("NEW", "CLOSED")).toBe(true);
    expect(isValidStatusTransition("NEW", "SPAM")).toBe(true);
  });

  it("allows a status to remain unchanged", () => {
    for (const status of INQUIRY_STATUSES) {
      expect(isValidStatusTransition(status, status)).toBe(true);
    }
  });

  it("allows CLOSED to reopen into REVIEWING only", () => {
    expect(isValidStatusTransition("CLOSED", "REVIEWING")).toBe(true);
    expect(isValidStatusTransition("CLOSED", "CONTACTED")).toBe(false);
    expect(isValidStatusTransition("CLOSED", "NEW")).toBe(false);
  });

  it("allows SPAM to be reclassified back to NEW only", () => {
    expect(isValidStatusTransition("SPAM", "NEW")).toBe(true);
    expect(isValidStatusTransition("SPAM", "CONTACTED")).toBe(false);
  });

  it("rejects an unknown status pairing that is not modeled", () => {
    expect(isValidStatusTransition("CONTACTED", "NEW")).toBe(false);
  });
});
