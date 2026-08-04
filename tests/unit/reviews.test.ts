import { describe, expect, it } from "vitest";

import { buildReviewDueDate, getNextReviewIntervalDays } from "@/lib/reviews/schedule";

describe("review schedule", () => {
  it("uses the simple spaced repetition intervals", () => {
    expect(getNextReviewIntervalDays()).toBe(1);
    expect(getNextReviewIntervalDays(1)).toBe(3);
    expect(getNextReviewIntervalDays(7)).toBe(15);
    expect(getNextReviewIntervalDays(15)).toBe(15);
  });

  it("builds due date from interval", () => {
    expect(buildReviewDueDate(new Date("2026-06-19T00:00:00.000Z"), 3).toISOString()).toBe(
      "2026-06-22T00:00:00.000Z"
    );
  });
});
