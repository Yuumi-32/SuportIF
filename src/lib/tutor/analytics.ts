import type { EngagementSeverity } from "@prisma/client";

export type ProgressItem = {
  completed: number;
  total: number;
};

export type DifficultyAnswerInput = {
  isCorrect: boolean;
  skillSlug?: string | null;
  skillName?: string | null;
  fallbackKey: string;
  fallbackLabel: string;
};

export type TutorDifficultyItem = {
  key: string;
  label: string;
  wrongCount: number;
  totalCount: number;
  errorRate: number;
};

export function calculateAverageProgress(items: ProgressItem[]) {
  if (items.length === 0) {
    return 0;
  }

  const progressValues = items.map((item) =>
    item.total <= 0 ? 0 : Math.round((item.completed / item.total) * 100)
  );

  return Math.round(
    progressValues.reduce((total, progress) => total + progress, 0) / progressValues.length
  );
}

export function getHighestEngagementSeverity(severities: EngagementSeverity[]): EngagementSeverity {
  if (severities.includes("HIGH_RISK")) {
    return "HIGH_RISK";
  }

  if (severities.includes("ATTENTION")) {
    return "ATTENTION";
  }

  return "NORMAL";
}

export function isReviewOverdue(input: { status: string; dueAt: Date }, now = new Date()) {
  return input.status === "OVERDUE" || (input.status === "PENDING" && input.dueAt < now);
}

export function aggregateDifficultyItems(answers: DifficultyAnswerInput[]) {
  const grouped = new Map<string, { label: string; wrongCount: number; totalCount: number }>();

  for (const answer of answers) {
    const key = answer.skillSlug ?? answer.fallbackKey;
    const label = answer.skillName ?? answer.fallbackLabel;
    const current = grouped.get(key) ?? { label, wrongCount: 0, totalCount: 0 };

    current.totalCount += 1;
    current.wrongCount += answer.isCorrect ? 0 : 1;
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      wrongCount: value.wrongCount,
      totalCount: value.totalCount,
      errorRate: value.totalCount === 0 ? 0 : Math.round((value.wrongCount / value.totalCount) * 100)
    }))
    .filter((item) => item.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || b.errorRate - a.errorRate || a.label.localeCompare(b.label));
}
