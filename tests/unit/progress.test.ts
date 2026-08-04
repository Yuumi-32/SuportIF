import { describe, expect, it } from "vitest";

import { calculateMissionMastery, getMissionStudyStatus } from "@/lib/progress/mission";
import { calculateProgressPercent } from "@/lib/progress/progress";
import { calculateTrackProgressPercent } from "@/lib/progress/track";

describe("progress rules", () => {
  it("calculates progress percent safely", () => {
    expect(calculateProgressPercent(0, 0)).toBe(0);
    expect(calculateProgressPercent(1, 4)).toBe(25);
    expect(calculateProgressPercent(3, 4)).toBe(75);
  });

  it("calculates mission mastery from attempts and unique correct exercises", () => {
    expect(calculateMissionMastery({ attemptsCount: 0, correctCount: 0, exerciseCount: 2 })).toBe(
      "NOT_STARTED"
    );
    expect(calculateMissionMastery({ attemptsCount: 1, correctCount: 0, exerciseCount: 2 })).toBe(
      "IN_PROGRESS"
    );
    expect(calculateMissionMastery({ attemptsCount: 3, correctCount: 0, exerciseCount: 2 })).toBe(
      "REVIEW"
    );
    expect(calculateMissionMastery({ attemptsCount: 2, correctCount: 1, exerciseCount: 2 })).toBe(
      "FAMILIAR"
    );
    expect(calculateMissionMastery({ attemptsCount: 2, correctCount: 2, exerciseCount: 2 })).toBe(
      "PROFICIENT"
    );
  });

  it("calculates mission status and track progress", () => {
    expect(getMissionStudyStatus({ attemptsCount: 0, correctCount: 0, exerciseCount: 2 })).toBe(
      "NOT_STARTED"
    );
    expect(getMissionStudyStatus({ attemptsCount: 1, correctCount: 1, exerciseCount: 2 })).toBe(
      "IN_PROGRESS"
    );
    expect(getMissionStudyStatus({ attemptsCount: 2, correctCount: 2, exerciseCount: 2 })).toBe(
      "COMPLETED"
    );
    expect(calculateTrackProgressPercent(3, 6)).toBe(50);
  });
});
