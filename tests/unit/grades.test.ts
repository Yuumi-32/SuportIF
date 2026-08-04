import { describe, expect, it } from "vitest";

import {
  buildHeatmap,
  calculatePeakHour,
  calculateStreaks,
  classifySkill,
  filterByRange,
  heatmapLevel,
  rangeStartDayKey,
  selectStrongPoints,
  selectWeakPoints,
  shiftDayKey,
  summarizeAnswers,
  summarizeSkillPerformance,
  toGrade,
  type AnswerEvent
} from "@/lib/grades/performance";

function answer(overrides: Partial<AnswerEvent> = {}): AnswerEvent {
  return {
    dayKey: "2026-06-19",
    hour: 20,
    isCorrect: true,
    source: "EXERCICIO",
    skillKey: "dns",
    skillLabel: "DNS",
    missionId: "missao-1",
    missionTitle: "Como o DNS resolve nomes",
    ...overrides
  };
}

describe("grades performance", () => {
  it("shifts day keys across month and year borders", () => {
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDayKey("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("resolves the first day of each range filter", () => {
    expect(rangeStartDayKey("todos", "2026-06-19")).toBeNull();
    expect(rangeStartDayKey("7d", "2026-06-19")).toBe("2026-06-13");
    expect(rangeStartDayKey("30d", "2026-06-19")).toBe("2026-05-21");
  });

  it("keeps only events inside the selected range", () => {
    const items = [{ dayKey: "2026-06-01" }, { dayKey: "2026-06-15" }, { dayKey: "2026-06-19" }];

    expect(filterByRange(items, "todos", "2026-06-19")).toHaveLength(3);
    expect(filterByRange(items, "7d", "2026-06-19").map((item) => item.dayKey)).toEqual([
      "2026-06-15",
      "2026-06-19"
    ]);
  });

  it("scales heatmap intensity by the busiest day", () => {
    expect(heatmapLevel(0, 10)).toBe(0);
    expect(heatmapLevel(1, 10)).toBe(1);
    expect(heatmapLevel(10, 10)).toBe(4);
    expect(heatmapLevel(1, 1)).toBe(4);
  });

  it("builds a heatmap grid ending on the week of today", () => {
    const heatmap = buildHeatmap(
      [
        { dayKey: "2026-06-19", hour: 9 },
        { dayKey: "2026-06-19", hour: 21 },
        { dayKey: "2026-06-18", hour: 8 }
      ],
      "2026-06-19",
      4
    );

    expect(heatmap.weeks).toHaveLength(4);
    expect(heatmap.weeks.every((week) => week.length === 7)).toBe(true);
    expect(heatmap.total).toBe(3);
    expect(heatmap.activeDays).toBe(2);
    expect(heatmap.maxCount).toBe(2);

    const days = heatmap.weeks.flat();
    expect(days.find((day) => day.dayKey === "2026-06-19")?.level).toBe(4);
    expect(days.find((day) => day.dayKey === "2026-06-18")?.level).toBe(2);
    expect(days.find((day) => day.dayKey === "2026-06-20")?.isFuture).toBe(true);
  });

  it("counts current and longest study streaks", () => {
    const streaks = calculateStreaks(
      ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-18", "2026-06-19", "2026-06-19"],
      "2026-06-19"
    );

    expect(streaks.current).toBe(2);
    expect(streaks.longest).toBe(3);
    expect(streaks.activeDays).toBe(5);
  });

  it("keeps the streak alive when the last study day was yesterday", () => {
    expect(calculateStreaks(["2026-06-17", "2026-06-18"], "2026-06-19").current).toBe(2);
    expect(calculateStreaks(["2026-06-16", "2026-06-17"], "2026-06-19").current).toBe(0);
    expect(calculateStreaks([], "2026-06-19")).toEqual({ current: 0, longest: 0, activeDays: 0 });
  });

  it("finds the busiest study hour", () => {
    expect(
      calculatePeakHour([
        { dayKey: "2026-06-18", hour: 22 },
        { dayKey: "2026-06-19", hour: 22 },
        { dayKey: "2026-06-19", hour: 8 }
      ])
    ).toEqual({ hour: 22, count: 2 });

    expect(calculatePeakHour([])).toBeNull();
  });

  it("turns accuracy into a 0-10 grade", () => {
    expect(toGrade(0)).toBe(0);
    expect(toGrade(84)).toBe(8.4);
    expect(toGrade(100)).toBe(10);
  });

  it("classifies a skill only with enough answers", () => {
    expect(classifySkill(100, 2)).toBe("SEM_DADOS");
    expect(classifySkill(90, 10)).toBe("FORTE");
    expect(classifySkill(65, 10)).toBe("ATENCAO");
    expect(classifySkill(40, 10)).toBe("FRAGIL");
  });

  it("summarizes overall answers", () => {
    const summary = summarizeAnswers([
      answer({ isCorrect: true }),
      answer({ isCorrect: false }),
      answer({ isCorrect: true }),
      answer({ isCorrect: true })
    ]);

    expect(summary).toEqual({ total: 4, correctCount: 3, wrongCount: 1, accuracy: 75, grade: 7.5 });
    expect(summarizeAnswers([]).accuracy).toBe(0);
  });

  it("grades skills from weakest to strongest and points to the worst mission", () => {
    const performance = summarizeSkillPerformance([
      answer({ skillKey: "dns", skillLabel: "DNS", isCorrect: true }),
      answer({ skillKey: "dns", skillLabel: "DNS", isCorrect: true }),
      answer({ skillKey: "dns", skillLabel: "DNS", isCorrect: true }),
      answer({ skillKey: "dns", skillLabel: "DNS", isCorrect: true }),
      answer({
        skillKey: "sub-redes",
        skillLabel: "Sub-redes",
        isCorrect: false,
        missionId: "missao-2",
        missionTitle: "Máscara de sub-rede"
      }),
      answer({
        skillKey: "sub-redes",
        skillLabel: "Sub-redes",
        isCorrect: false,
        missionId: "missao-2",
        missionTitle: "Máscara de sub-rede"
      }),
      answer({
        skillKey: "sub-redes",
        skillLabel: "Sub-redes",
        isCorrect: true,
        missionId: "missao-3",
        missionTitle: "Endereçamento IP"
      })
    ]);

    expect(performance.map((item) => item.key)).toEqual(["sub-redes", "dns"]);

    const [weakest, strongest] = performance;
    expect(weakest.accuracy).toBe(33);
    expect(weakest.grade).toBe(3.3);
    expect(weakest.status).toBe("FRAGIL");
    expect(weakest.weakestMission).toEqual({
      id: "missao-2",
      title: "Máscara de sub-rede",
      wrongCount: 2
    });

    expect(strongest.status).toBe("FORTE");
    expect(strongest.weakestMission).toBeNull();

    expect(selectWeakPoints(performance).map((item) => item.key)).toEqual(["sub-redes"]);
    expect(selectStrongPoints(performance).map((item) => item.key)).toEqual(["dns"]);
  });
});
