import {
  BookOpen,
  Calculator,
  Code,
  FileText,
  Network,
  Shield,
  Terminal,
  type LucideIcon
} from "lucide-react";

const trackIconMap: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  calculator: Calculator,
  code: Code,
  "file-text": FileText,
  network: Network,
  shield: Shield,
  terminal: Terminal
};

const levelLabels: Record<string, string> = {
  INTRODUCTORY: "Introdutória",
  BASIC: "Básico",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
  CHALLENGE: "Desafio"
};

const masteryStatusLabels: Record<string, string> = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  FAMILIAR: "Em familiarização",
  PROFICIENT: "Proficiente",
  MASTERED: "Dominado",
  REVIEW: "Revisar",
  COMPLETED: "Concluído"
};

const internalAttentionPoints: Record<string, string> = {
  "Validar conteúdo real posteriormente com material fornecido pelo usuário.":
    "Compare com materiais reais antes de usar em estudo definitivo.",
  "Valide conteúdo real depois com material fornecido pelo usuário.":
    "Compare com materiais reais antes de usar em estudo definitivo."
};

export function getTrackIcon(icon: string) {
  return trackIconMap[icon];
}

export function getLevelLabel(level: string | null | undefined) {
  if (!level) {
    return "Sem nível";
  }

  return levelLabels[level] ?? level;
}

export function getMissionDifficultyLabel(difficulty: string | null | undefined) {
  if (!difficulty) {
    return "Sem dificuldade";
  }

  return levelLabels[difficulty] ?? difficulty;
}

export function getMasteryStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Sem progresso";
  }

  return masteryStatusLabels[status] ?? status;
}

export function getAttentionPointText(point: string) {
  return internalAttentionPoints[point] ?? point;
}
