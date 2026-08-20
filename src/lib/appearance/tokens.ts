import { getPresetAccent, type AppearanceSettings } from "@/lib/appearance/settings";

/// Traduz a personalização do usuário em variáveis CSS.
///
/// As escalas `violet` e `slate` do Tailwind apontam para essas variáveis
/// (ver tailwind.config.ts), então trocar os valores aqui re-tematiza a
/// plataforma inteira sem precisar mexer classe por classe nos componentes.

export type Hsl = { h: number; s: number; l: number };

export const shadeKeys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Escala violeta original do Tailwind, em HSL. Serve de curva base para qualquer cor. */
const accentLadder: Hsl[] = [
  { h: 250, s: 100, l: 97.6 },
  { h: 251.4, s: 91.3, l: 95.5 },
  { h: 250.5, s: 95.2, l: 91.8 },
  { h: 252.5, s: 94.7, l: 85.1 },
  { h: 255.1, s: 91.7, l: 76.3 },
  { h: 258.3, s: 89.5, l: 66.3 },
  { h: 262.1, s: 83.3, l: 57.8 },
  { h: 263.4, s: 70, l: 50.4 },
  { h: 263.4, s: 69.3, l: 42.2 },
  { h: 263.5, s: 67.4, l: 34.9 },
  { h: 261.2, s: 72.6, l: 22.9 }
];

/** Escala slate original do Tailwind, em HSL. No tema escuro ela é invertida. */
const neutralLadder: Hsl[] = [
  { h: 210, s: 40, l: 98 },
  { h: 210, s: 40, l: 96.1 },
  { h: 214.3, s: 31.8, l: 91.4 },
  { h: 212.7, s: 26.8, l: 83.9 },
  { h: 215, s: 20.2, l: 65.1 },
  { h: 215.4, s: 16.3, l: 46.9 },
  { h: 215.3, s: 19.3, l: 34.5 },
  { h: 215.3, s: 25, l: 26.7 },
  { h: 217.2, s: 32.6, l: 17.5 },
  { h: 222.2, s: 47.4, l: 11.2 },
  { h: 228.6, s: 84, l: 4.9 }
];

/** Índice do tom 700 na escada — é o tom que a cor escolhida pelo usuário representa. */
const ANCHOR_INDEX = 7;

const cornerRadius: Record<string, number> = { SHARP: 0, DEFAULT: 8, ROUND: 16 };
const textSizePx: Record<string, number> = { COMPACT: 15, DEFAULT: 16, LARGE: 18 };
const headerShadeIndex: Record<string, number> = { LIGHT: 6, MEDIUM: 8, DARK: 10 };

const fontStacks: Record<string, string> = {
  SYSTEM:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  SERIF: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  MONO: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
};

const lightSurface: Record<string, string> = {
  CINZA: "#f8fafc",
  BRANCO: "#ffffff",
  TOM: "",
  AREIA: "#faf6ef"
};

const darkSurface: Record<string, string> = {
  CINZA: "#020617",
  BRANCO: "#0b1120",
  TOM: "",
  AREIA: "#12100c"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;

  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }

  return { h: round((h / 6) * 360), s: round(s * 100), l: round(l * 100) };
}

export function hslToHex({ h, s, l }: Hsl) {
  const saturation = s / 100;
  const lightness = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const f = (n: number) => lightness - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (value: number) =>
    Math.round(clamp(value, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function hslToCss({ h, s, l }: Hsl) {
  return `${round(h)} ${round(s)}% ${round(l)}%`;
}

/** Luminância relativa aproximada, usada para decidir texto claro ou escuro. */
export function isDarkColor(hex: string) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) < 0.4;
}

/**
 * Monta a escala de 11 tons a partir de uma cor só: o matiz e a saturação vêm da
 * cor escolhida, a curva de luminosidade vem do Tailwind. Assim qualquer cor gera
 * uma paleta com contraste utilizável, mesmo que o usuário escolha algo bem claro.
 */
export function buildAccentRamp(accentHex: string, strength = 100): Hsl[] {
  const base = hexToHsl(accentHex);
  const anchor = accentLadder[ANCHOR_INDEX];
  const saturationFactor = (base.s / anchor.s) * (strength / 100);
  const lightnessShift = clamp(base.l - anchor.l, -20, 20) * 0.3;

  return accentLadder.map((tone, index) => ({
    h: base.h,
    s: clamp(tone.s * saturationFactor, 0, 100),
    l: clamp(tone.l + lightnessShift * (index >= 4 ? 1 : 0.4), 3, 98)
  }));
}

export function buildNeutralRamp(dark: boolean): Hsl[] {
  return neutralLadder.map((tone, index) => (dark ? neutralLadder[10 - index] : tone));
}

/** Luminosidade das superfícies suaves (violet-50..300) no tema escuro. */
const darkTintLightness = [13, 17, 23, 31];

/**
 * No tema escuro os tons claros da paleta viram superfícies escuras — senão
 * `bg-violet-50` continuaria um retângulo branco no meio da tela. Os tons de 400
 * para cima ficam intactos porque são preenchimentos de marca com texto branco.
 */
export function adaptRampToDark(ramp: Hsl[]): Hsl[] {
  return ramp.map((tone, index) =>
    index < darkTintLightness.length ? { ...tone, l: darkTintLightness[index] } : tone
  );
}

export type ResolvedAppearance = {
  accentHex: string;
  accentRamp: Hsl[];
  neutralRamp: Hsl[];
  surfaceHex: string;
  cardHex: string;
  headerHsl: Hsl;
  textHsl: Hsl;
  radiusPx: number;
  fontSizePx: number;
  fontFamily: string;
  isDark: boolean;
  animations: boolean;
};

/**
 * Aplica as regras de nível: cada nível só enxerga os próprios controles, então
 * voltar para "Simples" ignora (sem apagar) o ajuste fino do "Avançado".
 */
export function resolveAppearance(settings: AppearanceSettings): ResolvedAppearance {
  const useIntermediate = settings.level === "INTERMEDIATE" || settings.level === "ADVANCED";
  const useAdvanced = settings.level === "ADVANCED";

  const accentHex =
    useIntermediate && settings.accent ? settings.accent : getPresetAccent(settings.preset);
  const isDarkTheme = settings.theme === "DARK";

  const baseRamp = buildAccentRamp(accentHex, useAdvanced ? settings.accentStrength : 100);
  const neutralRamp = buildNeutralRamp(isDarkTheme);

  const surfaceStyle = useIntermediate ? settings.surface : "CINZA";
  const tintedSurface = hslToHex(baseRamp[isDarkTheme ? 10 : 0]);
  const surfaceHex =
    useAdvanced && settings.surfaceColor
      ? settings.surfaceColor
      : surfaceStyle === "TOM"
        ? tintedSurface
        : (isDarkTheme ? darkSurface : lightSurface)[surfaceStyle];

  const cardHex =
    useAdvanced && settings.cardColor ? settings.cardColor : isDarkTheme ? "#0f172a" : "#ffffff";

  // Vale a escuridão real das superfícies, não só o tema: no nível avançado dá
  // para escolher um fundo escuro sem trocar o tema.
  const surfaceIsDark = isDarkColor(surfaceHex) || isDarkColor(cardHex);
  const accentRamp = surfaceIsDark ? adaptRampToDark(baseRamp) : baseRamp;

  const headerHsl =
    useAdvanced && settings.headerColor
      ? hexToHsl(settings.headerColor)
      : baseRamp[headerShadeIndex[useIntermediate ? settings.headerShade : "MEDIUM"]];

  const textHsl =
    useAdvanced && settings.textColor
      ? hexToHsl(settings.textColor)
      : surfaceIsDark
        ? { h: 210, s: 40, l: 96.1 }
        : { h: 222.2, s: 47.4, l: 11.2 };

  return {
    accentHex,
    accentRamp,
    neutralRamp,
    surfaceHex,
    cardHex,
    headerHsl,
    textHsl,
    radiusPx: useAdvanced ? settings.radiusPx : cornerRadius[settings.corners],
    fontSizePx: useAdvanced ? settings.fontSizePx : textSizePx[settings.textSize],
    fontFamily: fontStacks[useIntermediate ? settings.font : "SYSTEM"],
    isDark: surfaceIsDark,
    animations: useAdvanced ? settings.animations : true
  };
}

/** CSS pronto para ir num `<style>`. Todos os valores vêm de enums/números validados. */
export function buildAppearanceCss(settings: AppearanceSettings) {
  const resolved = resolveAppearance(settings);
  const surface = hexToHsl(resolved.surfaceHex);
  const card = hexToHsl(resolved.cardHex);

  const declarations = [
    ...resolved.accentRamp.map((tone, index) => `--violet-${shadeKeys[index]}:${hslToCss(tone)}`),
    ...resolved.neutralRamp.map((tone, index) => `--slate-${shadeKeys[index]}:${hslToCss(tone)}`),
    `--app-surface:${hslToCss(surface)}`,
    `--app-card:${hslToCss(card)}`,
    `--app-header:${hslToCss(resolved.headerHsl)}`,
    `--app-font:${resolved.fontFamily}`,
    `--background:${hslToCss(card)}`,
    `--card:${hslToCss(card)}`,
    `--card-foreground:${hslToCss(resolved.textHsl)}`,
    `--foreground:${hslToCss(resolved.textHsl)}`,
    // Tinta da marca para quem usa `style` inline e não alcança as classes.
    `--brand-ink:${hslToCss(resolved.accentRamp[resolved.isDark ? 4 : 8])}`,
    // Tinta semântica (atraso, alerta, acerto) pela mesma regra da marca: sobre
    // cartão escuro o tom fechado perde contraste e dá lugar ao tom claro.
    `--danger-ink:${resolved.isDark ? "0 90.6% 70.8%" : "0 73.7% 41.8%"}`,
    `--today-ink:${resolved.isDark ? "27 96% 61%" : "17.5 88.4% 40.4%"}`,
    `--warn-ink:${resolved.isDark ? "43.3 96.4% 56.3%" : "26 90.5% 37.1%"}`,
    `--ok-ink:${resolved.isDark ? "141.9 69.2% 58%" : "142.4 71.8% 29.2%"}`,
    `--primary:${hslToCss(resolved.accentRamp[8])}`,
    `--ring:${hslToCss(resolved.accentRamp[8])}`,
    `--accent:${hslToCss(resolved.accentRamp[1])}`,
    `--accent-foreground:${hslToCss(resolved.accentRamp[resolved.isDark ? 4 : 9])}`,
    `--border:${hslToCss(resolved.neutralRamp[2])}`,
    `--input:${hslToCss(resolved.neutralRamp[2])}`,
    `--muted:${hslToCss(resolved.neutralRamp[1])}`,
    `--muted-foreground:${hslToCss(resolved.neutralRamp[5])}`,
    `--secondary:${hslToCss(resolved.neutralRamp[1])}`,
    `--secondary-foreground:${hslToCss(resolved.neutralRamp[8])}`,
    `--radius:${resolved.radiusPx}px`,
    `font-size:${resolved.fontSizePx}px`
  ];

  const rules = [`:root{${declarations.join(";")}}`, `body{font-family:var(--app-font)}`];

  // Os tons 600+ são usados como tinta sobre superfícies claras. Com fundo
  // escuro eles somem, então a tinta passa a ser um tom claro da mesma paleta.
  if (resolved.isDark) {
    rules.push(
      ".text-violet-600,.text-violet-700,.text-violet-800,.text-violet-900,.text-violet-950{color:hsl(var(--violet-400))}",
      // O `:hover` tem especificidade maior, então precisa da própria regra.
      ".hover\\:text-violet-800:hover,.hover\\:text-violet-900:hover{color:hsl(var(--foreground))}"
    );
  }

  // Muitos cartões fixam `bg-white` na classe; sem esta regra a cor de cartão
  // escolhida (ou o tema escuro) não chegaria neles.
  if (resolved.cardHex.toLowerCase() !== "#ffffff") {
    rules.push(`.bg-white{background-color:hsl(var(--app-card))}`);
  }

  if (!resolved.animations) {
    rules.push(`*,*::before,*::after{transition:none!important;animation:none!important}`);
  }

  return rules.join("");
}
