import { describe, expect, it } from "vitest";

import { classifyEngagement } from "@/lib/engagement/classify";

describe("engagement classification", () => {
  it("classifies normal, attention and high risk cases", () => {
    expect(
      classifyEngagement({
        daysSinceLastAccess: 1,
        overdueReviews: 0,
        repeatedErrorsInSkill: 1,
        abandonedActiveTrack: false
      })
    ).toBe("NORMAL");

    expect(
      classifyEngagement({
        daysSinceLastAccess: 6,
        overdueReviews: 1,
        repeatedErrorsInSkill: 1,
        abandonedActiveTrack: false
      })
    ).toBe("ATTENTION");

    expect(
      classifyEngagement({
        daysSinceLastAccess: 2,
        overdueReviews: 7,
        repeatedErrorsInSkill: 1,
        abandonedActiveTrack: false
      })
    ).toBe("HIGH_RISK");
  });
});
