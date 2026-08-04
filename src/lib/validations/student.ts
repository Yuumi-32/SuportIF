import { z } from "zod";

export const startTrackSchema = z.object({
  trackId: z.string().min(1, "Trilha inválida.")
});

export const answerExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Exercício inválido."),
  selectedOptionId: z.string().min(1, "Selecione uma alternativa.")
});

export const completeReviewSchema = z.object({
  reviewId: z.string().min(1, "Revisão inválida.")
});

export const reviewGrades = ["ERREI", "DIFICIL", "BOM", "FACIL"] as const;

export const gradeReviewSchema = z.object({
  reviewId: z.string().min(1, "Revisão inválida."),
  grade: z.enum(reviewGrades)
});
