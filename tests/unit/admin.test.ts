import { describe, expect, it } from "vitest";

import {
  adminExerciseSchema,
  adminMissionSchema,
  adminSimulationSchema,
  adminTrackSchema
} from "@/lib/validations/admin";

describe("admin validations", () => {
  it("validates a track form", () => {
    const result = adminTrackSchema.safeParse({
      title: "Trilha demonstrativa",
      slug: "trilha-demonstrativa",
      description: "Conteúdo demonstrativo para validação do admin.",
      area: "Tecnologia",
      level: "BASIC",
      coverIcon: "BookOpen",
      color: "emerald",
      isPublic: "on",
      isDemo: "on"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid track slug", () => {
    const result = adminTrackSchema.safeParse({
      title: "Trilha demonstrativa",
      slug: "Slug Inválido",
      description: "Conteúdo demonstrativo para validação do admin.",
      area: "Tecnologia",
      level: "BASIC",
      coverIcon: "BookOpen",
      color: "emerald",
      isPublic: "on",
      isDemo: "on"
    });

    expect(result.success).toBe(false);
  });

  it("validates required mission content", () => {
    const result = adminMissionSchema.safeParse({
      moduleId: "module-1",
      title: "Missão demonstrativa",
      slug: "missao-demonstrativa",
      shortDescription: "Descrição curta da missão.",
      objective: "Compreender um conceito demonstrativo.",
      quickExplanation: "Explicação rápida demonstrativa.",
      detailedExplanation: "Explicação mastigada demonstrativa.",
      analogy: "Uma analogia simples.",
      practicalExample: "Um exemplo prático simples.",
      guidedExercisePrompt: "Pergunta guiada demonstrativa.",
      challengePrompt: "Desafio demonstrativo.",
      summary: "Resumo demonstrativo.",
      attentionPoints: "Ponto um\nPonto dois",
      difficulty: "BASIC",
      xpReward: "40",
      estimatedMinutes: "8",
      order: "1",
      isDemo: "on"
    });

    expect(result.success).toBe(true);
  });

  it("requires exactly one correct exercise option", () => {
    const base = {
      missionId: "mission-1",
      type: "MULTIPLE_CHOICE",
      prompt: "Qual alternativa está correta?",
      explanation: "Explicação demonstrativa.",
      difficulty: "BASIC",
      skillId: null,
      order: "1",
      isDemo: "on"
    };

    expect(
      adminExerciseSchema.safeParse({
        ...base,
        options: [
          { text: "Opção A", feedback: "Feedback A", isCorrect: true },
          { text: "Opção B", feedback: "Feedback B", isCorrect: false }
        ]
      }).success
    ).toBe(true);

    expect(
      adminExerciseSchema.safeParse({
        ...base,
        options: [
          { text: "Opção A", feedback: "Feedback A", isCorrect: true },
          { text: "Opção B", feedback: "Feedback B", isCorrect: true }
        ]
      }).success
    ).toBe(false);
  });

  it("requires simulation questions", () => {
    expect(
      adminSimulationSchema.safeParse({
        title: "Simulado demonstrativo",
        description: "Simulado com questões demonstrativas.",
        type: "MIXED",
        trackId: null,
        moduleId: null,
        isDemo: "on",
        exerciseIds: ["exercise-1"]
      }).success
    ).toBe(true);

    expect(
      adminSimulationSchema.safeParse({
        title: "Simulado demonstrativo",
        description: "Simulado com questões demonstrativas.",
        type: "MIXED",
        trackId: null,
        moduleId: null,
        isDemo: "on",
        exerciseIds: []
      }).success
    ).toBe(false);
  });
});
