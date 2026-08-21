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

export type AttentionReasonInput = {
  /** Mensagem do sinal de engajamento aberto mais grave, quando existe. */
  signalMessage?: string | null;
  /** Dias desde o último acesso; `null` quando a conta nunca entrou. */
  inactiveDays: number | null;
  overdueReviews: number;
  progressPercent: number;
  /** Média nos simulados entregues, ou `null` quando ainda não entregou nenhum. */
  simulationAverage: number | null;
};

function joinReasons(reasons: string[]) {
  if (reasons.length <= 1) {
    return reasons.join("");
  }

  return `${reasons.slice(0, -1).join(", ")} e ${reasons[reasons.length - 1]}`;
}

/**
 * A frase que explica por que o aluno caiu na lista de atenção.
 *
 * O sinal de engajamento tem prioridade: quando existe, ele já foi escrito para
 * ser lido. Sem sinal, a frase é montada a partir dos próprios números, na
 * ordem em que o professor age — sumiço primeiro, nota depois.
 */
export function buildAttentionReason(input: AttentionReasonInput) {
  if (input.signalMessage) {
    return input.signalMessage;
  }

  const reasons: string[] = [];

  if (input.inactiveDays === null) {
    reasons.push("ainda não acessou a plataforma");
  } else if (input.inactiveDays >= 7) {
    reasons.push(`está há ${input.inactiveDays} dias sem acessar`);
  }

  if (input.overdueReviews > 0) {
    reasons.push(
      input.overdueReviews === 1 ? "tem 1 revisão atrasada" : `tem ${input.overdueReviews} revisões atrasadas`
    );
  }

  if (input.simulationAverage !== null && input.simulationAverage < 50) {
    reasons.push(`ficou com média de ${input.simulationAverage}% nos simulados`);
  }

  if (input.simulationAverage === null) {
    reasons.push("não entregou nenhum simulado");
  }

  if (input.progressPercent < 40) {
    reasons.push(`concluiu ${input.progressPercent}% dos módulos`);
  }

  if (reasons.length === 0) {
    return "Está em dia nos números, mas segue marcado por um sinal de engajamento.";
  }

  // Duas razões bastam para o cartão: a terceira já é ruído para quem vai agir.
  const phrase = joinReasons(reasons.slice(0, 2));

  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}.`;
}
