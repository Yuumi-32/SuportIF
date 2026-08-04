import { describe, expect, it } from "vitest";

import {
  buildReviewTargetsFromWrongAnswers,
  calculateSimulationResult
} from "@/lib/simulations/results";
import {
  buildScoreChartData,
  getBestSimulationScore,
  getSimulationRecommendationStatus,
  parseSkillResults
} from "@/lib/simulations/presentation";
import {
  findMissingSimulationAnswers,
  hasDuplicateSimulationAnswers
} from "@/lib/simulations/submission";
import { submitSimulationSchema } from "@/lib/validations/simulation";

describe("simulation result", () => {
  it("calculates score and skill groups", () => {
    const result = calculateSimulationResult([
      { skillSlug: "ip", skillName: "IP", isCorrect: true },
      { skillSlug: "ip", skillName: "IP", isCorrect: true },
      { skillSlug: "dns", skillName: "DNS", isCorrect: false }
    ]);

    expect(result.correctCount).toBe(2);
    expect(result.wrongCount).toBe(1);
    expect(result.score).toBe(67);
    expect(result.strongSkills).toMatchObject([{ key: "ip", label: "IP", accuracy: 100 }]);
    expect(result.weakSkills).toMatchObject([{ key: "dns", label: "DNS", accuracy: 0 }]);
  });

  it("uses mission fallback when exercise has no skill", () => {
    const result = calculateSimulationResult([
      {
        fallbackSlug: "track/module/mission",
        fallbackName: "Trilha · Módulo · Missão",
        isCorrect: false
      }
    ]);

    expect(result.weakSkills).toMatchObject([
      { key: "track/module/mission", label: "Trilha · Módulo · Missão", accuracy: 0 }
    ]);
  });

  it("builds unique review targets from wrong answers", () => {
    expect(
      buildReviewTargetsFromWrongAnswers([
        { missionId: "mission-1", skillId: "skill-1", isCorrect: false },
        { missionId: "mission-1", skillId: "skill-1", isCorrect: false },
        { missionId: "mission-2", skillId: null, isCorrect: false },
        { missionId: "mission-3", skillId: "skill-3", isCorrect: true }
      ])
    ).toEqual([
      { missionId: "mission-1", skillId: "skill-1" },
      { missionId: "mission-2", skillId: null }
    ]);
  });

  it("validates incomplete simulation submission", () => {
    const parsed = submitSimulationSchema.safeParse({
      simulationId: "simulation-1",
      answers: [{ exerciseId: "exercise-1", selectedOptionId: "" }]
    });

    expect(parsed.success).toBe(false);
    expect(findMissingSimulationAnswers(["exercise-1", "exercise-2"], [])).toEqual([
      "exercise-1",
      "exercise-2"
    ]);
    expect(
      hasDuplicateSimulationAnswers([
        { exerciseId: "exercise-1", selectedOptionId: "option-1" },
        { exerciseId: "exercise-1", selectedOptionId: "option-2" }
      ])
    ).toBe(true);
  });

  it("parses skill result json and builds presentation status", () => {
    const skills = parseSkillResults([
      {
        key: "ip",
        label: "IP",
        correctCount: 2,
        wrongCount: 0,
        total: 2,
        accuracy: 100
      },
      { invalid: true }
    ]);

    expect(skills).toHaveLength(1);
    expect(getBestSimulationScore([{ score: 52 }, { score: 84 }])).toBe(84);
    expect(getSimulationRecommendationStatus([])).toBe("Recomendado");
    expect(getSimulationRecommendationStatus([{ score: 40 }])).toBe("Revisar e refazer");
    expect(buildScoreChartData(3, 1)).toEqual([
      { name: "Acertos", value: 3, fill: "#047857" },
      { name: "Erros", value: 1, fill: "#d97706" }
    ]);
  });
});
