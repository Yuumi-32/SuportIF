import {
  ExerciseType,
  MissionDifficulty,
  SimulationType,
  TrackLevel
} from "@prisma/client";
import { z } from "zod";

const optionalId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const optionalNullableId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().min(1).nullable().optional()
);

const checkbox = z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean());

const slug = z
  .string()
  .trim()
  .min(2, "Slug obrigatório.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.");

const requiredText = (label: string, min = 2) => z.string().trim().min(min, `${label} obrigatório.`);

export const adminTrackSchema = z.object({
  id: optionalId,
  title: requiredText("Título"),
  slug,
  description: requiredText("Descrição", 8),
  area: requiredText("Área"),
  level: z.nativeEnum(TrackLevel),
  coverIcon: requiredText("Ícone"),
  color: requiredText("Cor"),
  isPublic: checkbox,
  isDemo: checkbox
});

export const adminModuleSchema = z.object({
  id: optionalId,
  trackId: z.string().min(1, "Escolha uma trilha."),
  title: requiredText("Título"),
  slug,
  description: requiredText("Descrição", 8),
  order: z.coerce.number().int().min(1, "Ordem deve ser maior que zero."),
  isDemo: checkbox
});

export const adminMissionSchema = z.object({
  id: optionalId,
  moduleId: z.string().min(1, "Escolha um módulo."),
  title: requiredText("Título"),
  slug,
  shortDescription: requiredText("Descrição curta", 8),
  objective: requiredText("Objetivo", 8),
  quickExplanation: requiredText("Explicação rápida", 8),
  detailedExplanation: requiredText("Explicação mastigada", 8),
  analogy: requiredText("Analogia", 5),
  practicalExample: requiredText("Exemplo prático", 5),
  guidedExercisePrompt: requiredText("Exercício guiado", 5),
  challengePrompt: requiredText("Desafio", 5),
  summary: requiredText("Resumo", 5),
  attentionPoints: z
    .string()
    .trim()
    .min(3, "Informe pelo menos um ponto de atenção.")
    .transform((value) =>
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  difficulty: z.nativeEnum(MissionDifficulty),
  xpReward: z.coerce.number().int().min(0, "XP não pode ser negativo."),
  estimatedMinutes: z.coerce.number().int().min(1, "Tempo estimado inválido."),
  order: z.coerce.number().int().min(1, "Ordem deve ser maior que zero."),
  isDemo: checkbox
});

export const adminExerciseOptionSchema = z.object({
  id: optionalId,
  text: requiredText("Texto da alternativa"),
  feedback: requiredText("Feedback da alternativa", 3),
  isCorrect: z.boolean()
});

export const adminExerciseSchema = z
  .object({
    id: optionalId,
    missionId: z.string().min(1, "Escolha uma missão."),
    type: z.nativeEnum(ExerciseType),
    prompt: requiredText("Enunciado", 8),
    explanation: requiredText("Explicação", 8),
    difficulty: z.nativeEnum(MissionDifficulty),
    skillId: optionalNullableId,
    order: z.coerce.number().int().min(1, "Ordem deve ser maior que zero."),
    isDemo: checkbox,
    options: z.array(adminExerciseOptionSchema).min(2, "Informe pelo menos duas alternativas.")
  })
  .refine((data) => data.options.filter((option) => option.isCorrect).length === 1, {
    message: "Exercícios de múltipla escolha exigem exatamente uma alternativa correta.",
    path: ["options"]
  });

export const adminSimulationSchema = z.object({
  id: optionalId,
  title: requiredText("Título"),
  description: requiredText("Descrição", 8),
  type: z.nativeEnum(SimulationType),
  trackId: optionalNullableId,
  moduleId: optionalNullableId,
  isDemo: checkbox,
  exerciseIds: z.array(z.string().min(1)).min(1, "Escolha pelo menos uma questão.")
});

export const adminBadgeSchema = z.object({
  id: optionalId,
  title: requiredText("Título"),
  slug,
  description: requiredText("Descrição", 8),
  icon: requiredText("Ícone"),
  rule: requiredText("Regra", 3),
  isDemo: checkbox
});

export function parseExerciseOptionsFromForm(formData: FormData) {
  const optionIds = formData.getAll("optionId").map(String);
  const texts = formData.getAll("optionText").map(String);
  const feedbacks = formData.getAll("optionFeedback").map(String);
  const correctIndex = Number(formData.get("correctOptionIndex"));

  return texts
    .map((text, index) => ({
      id: optionIds[index] ?? "",
      text: text.trim(),
      feedback: (feedbacks[index] ?? "").trim(),
      isCorrect: index === correctIndex
    }))
    .filter((option) => option.id || option.text || option.feedback);
}
