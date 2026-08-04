import { z } from "zod";

import { layoutsSchema } from "@/lib/appearance/layout";

/// Personalização visual do usuário.
///
/// A ideia dos três níveis é a profundidade do controle:
/// - SIMPLE: escolhas prontas (tema, tamanho do texto, cantos);
/// - INTERMEDIATE: escolhas guiadas (cor livre, fundo, fonte, cabeçalho);
/// - ADVANCED: valores exatos por token (px, cores individuais, animações).
///
/// Os campos de todos os níveis ficam salvos, mas só valem os do nível ativo:
/// voltar para "Simples" não apaga o ajuste fino feito no "Avançado".

export const appearanceLevels = ["SIMPLE", "INTERMEDIATE", "ADVANCED"] as const;
export type AppearanceLevel = (typeof appearanceLevels)[number];

export const appearancePresets = [
  { id: "violeta", label: "Violeta", accent: "#6d28d9" },
  { id: "oceano", label: "Oceano", accent: "#1d4ed8" },
  { id: "esmeralda", label: "Esmeralda", accent: "#047857" },
  { id: "ambar", label: "Âmbar", accent: "#b45309" },
  { id: "framboesa", label: "Framboesa", accent: "#be185d" },
  { id: "grafite", label: "Grafite", accent: "#334155" }
] as const;

export const appearancePresetIds = appearancePresets.map((preset) => preset.id) as unknown as [
  string,
  ...string[]
];

export const colorThemes = ["LIGHT", "DARK"] as const;
export const textSizes = ["COMPACT", "DEFAULT", "LARGE"] as const;
export const cornerStyles = ["SHARP", "DEFAULT", "ROUND"] as const;
export const surfaceStyles = ["CINZA", "BRANCO", "TOM", "AREIA"] as const;
export const fontFamilies = ["SYSTEM", "SERIF", "MONO"] as const;
export const headerShades = ["LIGHT", "MEDIUM", "DARK"] as const;

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use uma cor no formato #rrggbb.")
  .transform((value) => value.toLowerCase());

const optionalHexColor = hexColor.nullable().catch(null);

export const appearanceSchema = z.object({
  level: z.enum(appearanceLevels).catch("SIMPLE"),

  // Nível simples
  theme: z.enum(colorThemes).catch("LIGHT"),
  preset: z.enum(appearancePresetIds).catch("violeta"),
  textSize: z.enum(textSizes).catch("DEFAULT"),
  corners: z.enum(cornerStyles).catch("DEFAULT"),

  // Nível intermediário
  accent: optionalHexColor,
  surface: z.enum(surfaceStyles).catch("CINZA"),
  font: z.enum(fontFamilies).catch("SYSTEM"),
  headerShade: z.enum(headerShades).catch("MEDIUM"),

  // Nível avançado
  accentStrength: z.number().int().min(40).max(160).catch(100),
  radiusPx: z.number().int().min(0).max(24).catch(8),
  fontSizePx: z.number().int().min(13).max(20).catch(16),
  headerColor: optionalHexColor,
  surfaceColor: optionalHexColor,
  cardColor: optionalHexColor,
  textColor: optionalHexColor,
  animations: z.boolean().catch(true),

  // Modo de interface livre — independente dos três níveis acima.
  freeLayout: z.boolean().catch(false),
  layout: layoutsSchema
});

export type AppearanceSettings = z.infer<typeof appearanceSchema>;

export const defaultAppearance: AppearanceSettings = {
  level: "SIMPLE",
  theme: "LIGHT",
  preset: "violeta",
  textSize: "DEFAULT",
  corners: "DEFAULT",
  accent: null,
  surface: "CINZA",
  font: "SYSTEM",
  headerShade: "MEDIUM",
  accentStrength: 100,
  radiusPx: 8,
  fontSizePx: 16,
  headerColor: null,
  surfaceColor: null,
  cardColor: null,
  textColor: null,
  animations: true,
  freeLayout: false,
  layout: []
};

/** Lê o JSON salvo no banco (ou vindo do formulário) sem nunca lançar erro. */
export function parseAppearance(value: unknown): AppearanceSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAppearance;
  }

  const result = appearanceSchema.safeParse({ ...defaultAppearance, ...(value as object) });
  return result.success ? result.data : defaultAppearance;
}

export function getPresetAccent(presetId: string) {
  const preset = appearancePresets.find((item) => item.id === presetId);
  return preset ? preset.accent : appearancePresets[0].accent;
}
