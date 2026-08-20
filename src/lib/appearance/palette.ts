/// Paleta do tema para componentes que estilizam com `style` inline.
///
/// Regra prática: `fill` é fundo de marca com texto branco por cima; `brandInk`
/// é texto/ícone na cor da marca, que precisa clarear quando o fundo é escuro.
/// Cores de alerta (âmbar, vermelho) continuam fixas de propósito — são
/// semânticas e não devem seguir a personalização.

export const theme: Record<string, string> = {
  card: "hsl(var(--app-card))",
  surface: "hsl(var(--app-surface))",
  ink: "hsl(var(--foreground))",
  ink2: "hsl(var(--slate-600))",
  muted: "hsl(var(--slate-500))",
  faint: "hsl(var(--slate-400))",
  line: "hsl(var(--slate-200))",
  line2: "hsl(var(--slate-300))",
  chip: "hsl(var(--slate-100))",
  fill: "hsl(var(--violet-800))",
  fillDark: "hsl(var(--violet-900))",
  brandInk: "hsl(var(--brand-ink))",
  brandSoft: "hsl(var(--violet-100))",
  brandTint: "hsl(var(--violet-50))",
  brandLine: "hsl(var(--violet-200))",
  brandLine2: "hsl(var(--violet-300))",
  brandMid: "hsl(var(--violet-400))",
  shadow: "hsl(var(--slate-950) / 0.06)",
  onFill: "#fff",
  warn: "#b45309",
  warnFill: "#f59e0b",
  warnSoft: "#fef3c7",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
  ok: "#15803d",
  okSoft: "#dcfce7"
};
