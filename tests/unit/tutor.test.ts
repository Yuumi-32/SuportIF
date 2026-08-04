import { describe, expect, it } from "vitest";

import {
  aggregateDifficultyItems,
  calculateAverageProgress,
  getHighestEngagementSeverity,
  isReviewOverdue
} from "@/lib/tutor/analytics";
import { teacherNoteSchema } from "@/lib/validations/teacher";

describe("tutor analytics", () => {
  it("calculates average class progress", () => {
    expect(
      calculateAverageProgress([
        { completed: 2, total: 4 },
        { completed: 1, total: 4 },
        { completed: 0, total: 0 }
      ])
    ).toBe(25);
  });

  it("classifies highest engagement severity", () => {
    expect(getHighestEngagementSeverity(["NORMAL", "ATTENTION"])).toBe("ATTENTION");
    expect(getHighestEngagementSeverity(["NORMAL", "HIGH_RISK", "ATTENTION"])).toBe("HIGH_RISK");
  });

  it("counts overdue reviews from status or due date", () => {
    const now = new Date("2026-06-19T00:00:00.000Z");

    expect(isReviewOverdue({ status: "PENDING", dueAt: new Date("2026-06-18T00:00:00.000Z") }, now)).toBe(
      true
    );
    expect(isReviewOverdue({ status: "OVERDUE", dueAt: new Date("2026-06-21T00:00:00.000Z") }, now)).toBe(
      true
    );
    expect(isReviewOverdue({ status: "PENDING", dueAt: new Date("2026-06-21T00:00:00.000Z") }, now)).toBe(
      false
    );
  });

  it("aggregates difficulties by skill with fallback", () => {
    const result = aggregateDifficultyItems([
      {
        isCorrect: false,
        skillSlug: "dns",
        skillName: "DNS",
        fallbackKey: "redes/dns/fundamentos",
        fallbackLabel: "Redes · DNS"
      },
      {
        isCorrect: true,
        skillSlug: "dns",
        skillName: "DNS",
        fallbackKey: "redes/dns/fundamentos",
        fallbackLabel: "Redes · DNS"
      },
      {
        isCorrect: false,
        fallbackKey: "linux/terminal/fundamentos",
        fallbackLabel: "Linux · Terminal"
      }
    ]);

    expect(result).toMatchObject([
      {
        key: "linux/terminal/fundamentos",
        label: "Linux · Terminal",
        wrongCount: 1,
        totalCount: 1,
        errorRate: 100
      },
      { key: "dns", label: "DNS", wrongCount: 1, totalCount: 2, errorRate: 50 }
    ]);
  });

  it("validates empty teacher note", () => {
    expect(teacherNoteSchema.safeParse({ studentId: "student-1", note: "" }).success).toBe(false);
  });
});
