export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 15] as const;

export function getNextReviewIntervalDays(previousIntervalDays?: number) {
  if (!previousIntervalDays) {
    return REVIEW_INTERVALS_DAYS[0];
  }

  const currentIndex = REVIEW_INTERVALS_DAYS.findIndex((interval) => interval === previousIntervalDays);
  return REVIEW_INTERVALS_DAYS[Math.min(currentIndex + 1, REVIEW_INTERVALS_DAYS.length - 1)];
}

export function buildReviewDueDate(from: Date, intervalDays: number) {
  const dueAt = new Date(from);
  dueAt.setDate(dueAt.getDate() + intervalDays);
  return dueAt;
}

export type ReviewGrade = "ERREI" | "DIFICIL" | "BOM" | "FACIL";

/**
 * Escolhe o próximo intervalo a partir da nota que o aluno deu para si mesmo.
 * "Errei" volta ao começo, "Difícil" repete o intervalo atual, "Bom" avança um
 * degrau e "Fácil" avança dois.
 */
export function getIntervalDaysForGrade(grade: ReviewGrade, currentIntervalDays?: number) {
  const intervals = REVIEW_INTERVALS_DAYS;
  const currentIndex = Math.max(
    0,
    intervals.findIndex((interval) => interval === currentIntervalDays)
  );

  const stepByGrade: Record<ReviewGrade, number> = {
    ERREI: -currentIndex,
    DIFICIL: 0,
    BOM: 1,
    FACIL: 2
  };

  const nextIndex = Math.min(intervals.length - 1, Math.max(0, currentIndex + stepByGrade[grade]));
  return intervals[nextIndex];
}

/** Quanto da escada de revisões esse intervalo já cobriu (0 a 100). */
export function getRetentionPercent(intervalDays: number) {
  const index = REVIEW_INTERVALS_DAYS.findIndex((interval) => interval === intervalDays);
  const position = index >= 0 ? index + 1 : 1;
  return Math.round((position / REVIEW_INTERVALS_DAYS.length) * 100);
}
