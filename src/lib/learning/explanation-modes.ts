/// Modos de explicação de uma missão. O valor escolhido é gravado em
/// `Profile.preferredExplanationMode` e define qual aba abre primeiro na missão.

export const explanationModeValues = ["QUICK", "DETAILED", "ANALOGY", "EXAMPLE", "SUMMARY"] as const;

export type ExplanationMode = (typeof explanationModeValues)[number];

export const DEFAULT_EXPLANATION_MODE: ExplanationMode = "DETAILED";

type ExplanationModeOption = {
  value: ExplanationMode;
  label: string;
  description: string;
  /** Id da aba correspondente em `ExplanationTabs`. */
  sectionId: string;
};

export const explanationModes: ExplanationModeOption[] = [
  {
    value: "QUICK",
    label: "Rápida",
    description: "Direto ao ponto, para revisar em poucos minutos.",
    sectionId: "rapida"
  },
  {
    value: "DETAILED",
    label: "Mastigada",
    description: "Passo a passo completo, para o primeiro contato com o assunto.",
    sectionId: "mastigada"
  },
  {
    value: "ANALOGY",
    label: "Analogia",
    description: "Comparações do dia a dia antes da parte técnica.",
    sectionId: "analogia"
  },
  {
    value: "EXAMPLE",
    label: "Exemplo",
    description: "Começa por um caso prático e depois generaliza.",
    sectionId: "exemplo"
  },
  {
    value: "SUMMARY",
    label: "Resumo",
    description: "Só os pontos principais, útil na véspera da prova.",
    sectionId: "resumo"
  }
];

export function isExplanationMode(value: string | null | undefined): value is ExplanationMode {
  return explanationModeValues.includes(value as ExplanationMode);
}

export function toExplanationMode(value: string | null | undefined): ExplanationMode {
  return isExplanationMode(value) ? value : DEFAULT_EXPLANATION_MODE;
}

export function getExplanationModeLabel(value: string | null | undefined) {
  const mode = toExplanationMode(value);
  return explanationModes.find((option) => option.value === mode)?.label ?? mode;
}

/** Id da aba que deve abrir primeiro na missão para o modo informado. */
export function getExplanationSectionId(value: string | null | undefined) {
  const mode = toExplanationMode(value);
  return explanationModes.find((option) => option.value === mode)?.sectionId ?? "mastigada";
}
