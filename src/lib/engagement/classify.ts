import type { EngagementSeverity } from "@prisma/client";

export type EngagementInput = {
  daysSinceLastAccess: number;
  overdueReviews: number;
  repeatedErrorsInSkill: number;
  abandonedActiveTrack: boolean;
};

export function classifyEngagement(input: EngagementInput): EngagementSeverity {
  if (
    input.daysSinceLastAccess >= 14 ||
    input.overdueReviews >= 6 ||
    input.repeatedErrorsInSkill >= 5 ||
    input.abandonedActiveTrack
  ) {
    return "HIGH_RISK";
  }

  if (input.daysSinceLastAccess >= 5 || input.overdueReviews >= 3 || input.repeatedErrorsInSkill >= 3) {
    return "ATTENTION";
  }

  return "NORMAL";
}
