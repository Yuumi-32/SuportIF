export type SkillResultView = {
  key: string;
  label: string;
  correctCount: number;
  wrongCount: number;
  total: number;
  accuracy: number;
};

export type SimulationAttemptView = {
  id?: string;
  score: number;
  finishedAt?: Date | null;
};

export function parseSkillResults(value: unknown): SkillResultView[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SkillResultView => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Partial<SkillResultView>;
    return (
      typeof candidate.key === "string" &&
      typeof candidate.label === "string" &&
      typeof candidate.correctCount === "number" &&
      typeof candidate.wrongCount === "number" &&
      typeof candidate.total === "number" &&
      typeof candidate.accuracy === "number"
    );
  });
}

export function formatHumanLabel(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "Sem classificação";
  }

  if (!normalized.includes("-") && normalized !== normalized.toLowerCase()) {
    return normalized;
  }

  const acronyms = new Set(["dns", "ip", "http", "https", "linux"]);
  const connectors = new Set(["a", "as", "com", "da", "de", "do", "dos", "e", "em", "na", "no", "o", "os", "para", "por", "que", "uma", "um"]);

  return normalized
    .split("-")
    .filter(Boolean)
    .map((part, index, parts) => {
      if (acronyms.has(part)) {
        return part.toUpperCase();
      }

      if (part === "e" && parts[index - 1] === "que") {
        return "é";
      }

      if (index > 0 && connectors.has(part)) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function getSkillDisplayName(skill: Pick<SkillResultView, "key" | "label">) {
  if (skill.label && skill.label !== skill.key && !skill.label.includes("-")) {
    return skill.label;
  }

  return formatHumanLabel(skill.label || skill.key);
}

export function getSimulationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    TRACK: "Simulado da trilha",
    MODULE: "Simulado do módulo",
    REVIEW: "Revisão prática",
    MIXED: "Prática mista",
    DEMO_EXAM: "Conteúdo demonstrativo"
  };

  return labels[type] ?? formatHumanLabel(type);
}

export function getSimulationDescriptionText(description: string) {
  if (description.includes("Estrutura genérica de simulado.")) {
    return "Simulado demonstrativo para praticar organização de estudos.";
  }

  return description;
}

export function getReviewStatusLabel(status: string) {
  const labels: Record<string, string> = {
    OVERDUE: "Atrasada",
    PENDING: "Pendente",
    DONE: "Concluída",
    SKIPPED: "Ignorada"
  };

  return labels[status] ?? formatHumanLabel(status);
}

export function formatReviewDueText(dueAt: Date, now = new Date()) {
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dueDay = startOfDay(dueAt);
  const today = startOfDay(now);
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "vence hoje";
  }

  if (diffDays === 1) {
    return "vence amanhã";
  }

  if (diffDays > 1) {
    return `vence em ${diffDays} dias`;
  }

  const overdueDays = Math.abs(diffDays);
  return overdueDays === 1 ? "venceu ontem" : `venceu há ${overdueDays} dias`;
}

export function getBestSimulationScore(attempts: SimulationAttemptView[]) {
  if (attempts.length === 0) {
    return null;
  }

  return Math.max(...attempts.map((attempt) => attempt.score));
}

export function getSimulationRecommendationStatus(attempts: SimulationAttemptView[]) {
  if (attempts.length === 0) {
    return "Recomendado";
  }

  const bestScore = getBestSimulationScore(attempts) ?? 0;

  if (bestScore < 60) {
    return "Revisar e refazer";
  }

  if (bestScore < 80) {
    return "Bom para praticar";
  }

  return "Consolidado";
}

export function buildScoreChartData(correctCount: number, wrongCount: number) {
  return [
    { name: "Acertos", value: correctCount, fill: "#047857" },
    { name: "Erros", value: wrongCount, fill: "#d97706" }
  ];
}
