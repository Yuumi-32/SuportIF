import { describe, expect, it } from "vitest";

import {
  aggregateDifficultyItems,
  buildAttentionReason,
  calculateAverageProgress,
  getHighestEngagementSeverity,
  isReviewOverdue
} from "@/lib/tutor/analytics";
import { teacherModuleSchema, teacherNoteSchema } from "@/lib/validations/teacher";

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

  it("prefers the engagement signal message as the attention reason", () => {
    expect(
      buildAttentionReason({
        signalMessage: "Parou no meio do módulo de redes.",
        inactiveDays: 21,
        overdueReviews: 4,
        progressPercent: 10,
        simulationAverage: 30
      })
    ).toBe("Parou no meio do módulo de redes.");
  });

  it("builds the attention reason from the numbers when there is no signal", () => {
    expect(
      buildAttentionReason({
        inactiveDays: 12,
        overdueReviews: 3,
        progressPercent: 24,
        simulationAverage: 62
      })
    ).toBe("Está há 12 dias sem acessar e tem 3 revisões atrasadas.");

    expect(
      buildAttentionReason({
        inactiveDays: 1,
        overdueReviews: 0,
        progressPercent: 22,
        simulationAverage: null
      })
    ).toBe("Não entregou nenhum simulado e concluiu 22% dos módulos.");
  });

  it("keeps a reason even when only the signal explains the risk", () => {
    expect(
      buildAttentionReason({
        inactiveDays: 2,
        overdueReviews: 0,
        progressPercent: 90,
        simulationAverage: 88
      })
    ).toBe("Está em dia nos números, mas segue marcado por um sinal de engajamento.");
  });

  it("validates the module the teacher creates from the panel", () => {
    expect(
      teacherModuleSchema.safeParse({
        trackId: "track-1",
        title: "Redes na prática",
        description: "Uma etapa curta sobre endereços e serviços."
      }).success
    ).toBe(true);

    expect(
      teacherModuleSchema.safeParse({ trackId: "", title: "Redes", description: "curta" }).success
    ).toBe(false);
  });
});
