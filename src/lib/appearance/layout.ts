import { z } from "zod";

/// Layout livre das páginas do aluno: quais blocos aparecem, em que ordem e com
/// quanto detalhe. O tamanho é o próprio controle de detalhe — bloco maior
/// mostra mais informação, bloco menor mostra só o essencial.

export const layoutPages = ["inicio", "trilhas", "simulados", "revisoes"] as const;
export type LayoutPage = (typeof layoutPages)[number];

export const blockSizes = ["P", "M", "G"] as const;
export type BlockSize = (typeof blockSizes)[number];

/** Quantas das 6 colunas da grade cada tamanho ocupa. */
export const blockSpan: Record<BlockSize, number> = { P: 2, M: 3, G: 6 };

export const blockSizeLabels: Record<BlockSize, string> = {
  P: "Pequeno",
  M: "Médio",
  G: "Grande"
};

export const blockLabels: Record<string, string> = {
  // Início
  hero: "Boas-vindas",
  "next-step": "Próximo passo",
  badges: "Conquistas",
  stats: "Seus números",
  "track-map": "Trilha em foco",
  tracks: "Trilhas em andamento",
  simulation: "Simulados",
  reviews: "Revisões",
  // Trilhas
  "tracks-header": "Título",
  "tracks-stats": "Resumo",
  "tracks-filters": "Busca e filtros",
  "tracks-active": "Em andamento",
  "tracks-available": "Disponíveis",
  // Simulados
  "sims-header": "Título",
  "sims-stats": "Resumo",
  "sims-list": "Lista de simulados",
  // Revisões
  "reviews-header": "Título",
  "reviews-stats": "Resumo",
  "reviews-filters": "Filtros",
  "reviews-list": "Fila de revisões"
};

const coordinate = z.number().finite().min(-4000).max(40000).optional().catch(undefined);

export const layoutItemSchema = z.object({
  id: z.string().min(1).max(40),
  size: z.enum(blockSizes).catch("M"),
  hidden: z.boolean().catch(false),
  // Posição livre, em pixels. Ausente = o bloco ainda está no desenho em grade.
  x: coordinate,
  y: coordinate,
  w: z.number().finite().min(200).max(4000).optional().catch(undefined),
  h: z.number().finite().min(90).max(6000).optional().catch(undefined)
});

export type DashboardLayoutItem = z.infer<typeof layoutItemSchema>;

export type BlockBox = { x: number; y: number; w: number; h: number };

/** Um bloco só é "livre" quando tem as quatro coordenadas. */
export function blockBox(item: DashboardLayoutItem): BlockBox | null {
  const { x, y, w, h } = item;
  return x !== undefined && y !== undefined && w !== undefined && h !== undefined
    ? { x, y, w, h }
    : null;
}

/** A página inteira vira canvas livre quando todo bloco visível tem caixa. */
export function isFreeCanvas(items: DashboardLayoutItem[]) {
  const visible = items.filter((item) => !item.hidden);
  return visible.length > 0 && visible.every((item) => blockBox(item) !== null);
}

/**
 * Quanto detalhe cabe numa largura. É o que substitui os botões − e +:
 * arrastar a alça e estreitar o bloco já resume o conteúdo.
 */
export function sizeFromWidth(width: number): BlockSize {
  if (width < 380) {
    return "P";
  }
  return width < 680 ? "M" : "G";
}

export function withBox(item: DashboardLayoutItem, box: BlockBox): DashboardLayoutItem {
  return {
    ...item,
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.w),
    h: Math.round(box.h),
    size: sizeFromWidth(box.w)
  };
}

/** Volta o bloco para o desenho em grade. */
export function withoutBox(item: DashboardLayoutItem): DashboardLayoutItem {
  return { id: item.id, size: item.size, hidden: item.hidden };
}

const layoutArraySchema = z.array(layoutItemSchema).max(40);

export const layoutSchema = layoutArraySchema.catch([]);

/**
 * Formato salvo: um layout por página. O formato antigo (uma lista só) continua
 * sendo aceito e vale como layout do início.
 *
 * A união usa o schema sem `.catch` de propósito: com `.catch` o primeiro ramo
 * nunca falharia e o formato por página jamais seria reconhecido.
 */
export const layoutsSchema = z
  .union([layoutArraySchema, z.record(z.string(), layoutArraySchema)])
  .catch([]);

export type SavedLayouts = z.infer<typeof layoutsSchema>;

/** Desenho padrão de cada página, reproduzindo o que já existia. */
export const defaultLayouts: Record<LayoutPage, DashboardLayoutItem[]> = {
  inicio: [
    { id: "hero", size: "G", hidden: false },
    { id: "next-step", size: "M", hidden: false },
    { id: "badges", size: "M", hidden: false },
    { id: "stats", size: "G", hidden: false },
    { id: "track-map", size: "G", hidden: false },
    { id: "tracks", size: "G", hidden: false },
    { id: "simulation", size: "G", hidden: false },
    { id: "reviews", size: "G", hidden: false }
  ],
  trilhas: [
    { id: "tracks-header", size: "G", hidden: false },
    { id: "tracks-stats", size: "G", hidden: false },
    { id: "tracks-filters", size: "G", hidden: false },
    { id: "tracks-active", size: "G", hidden: false },
    { id: "tracks-available", size: "G", hidden: false }
  ],
  simulados: [
    { id: "sims-header", size: "M", hidden: false },
    { id: "sims-stats", size: "M", hidden: false },
    { id: "sims-list", size: "G", hidden: false }
  ],
  revisoes: [
    { id: "reviews-header", size: "G", hidden: false },
    { id: "reviews-stats", size: "G", hidden: false },
    { id: "reviews-filters", size: "G", hidden: false },
    { id: "reviews-list", size: "G", hidden: false }
  ]
};

export function isLayoutPage(value: string): value is LayoutPage {
  return (layoutPages as readonly string[]).includes(value);
}

/**
 * Normaliza o que veio do banco: mantém a ordem salva, descarta bloco que não
 * existe mais e acrescenta no fim os blocos que ainda não estavam no layout —
 * assim um bloco novo da plataforma aparece para quem já personalizou.
 */
export function normalizeLayout(saved: unknown, page: LayoutPage = "inicio"): DashboardLayoutItem[] {
  const fallback = defaultLayouts[page];
  const known = new Set(fallback.map((item) => item.id));
  const parsed = layoutSchema.safeParse(saved);
  const items = parsed.success ? parsed.data : [];
  const seen = new Set<string>();
  const result: DashboardLayoutItem[] = [];

  for (const item of items) {
    if (seen.has(item.id) || !known.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }

  // Bloco novo da plataforma entra embaixo de todos. Sem isso ele chegaria sem
  // coordenada e a página inteira voltaria da posição livre para a grade.
  const bottom = result.reduce((acc, item) => {
    const box = blockBox(item);
    return box ? Math.max(acc, box.y + box.h) : acc;
  }, 0);
  const canvasIsFree = result.length > 0 && result.every((item) => blockBox(item) !== null);

  let cursor = bottom + 20;

  for (const item of fallback) {
    if (seen.has(item.id)) {
      continue;
    }

    if (canvasIsFree) {
      result.push(withBox(item, { x: 0, y: cursor, w: 720, h: 260 }));
      cursor += 280;
    } else {
      result.push(item);
    }
  }

  return result;
}

/** Layout de uma página, aceitando também o formato antigo (lista = início). */
export function pageLayout(saved: unknown, page: LayoutPage): DashboardLayoutItem[] {
  if (Array.isArray(saved)) {
    return normalizeLayout(page === "inicio" ? saved : [], page);
  }

  if (saved && typeof saved === "object") {
    return normalizeLayout((saved as Record<string, unknown>)[page], page);
  }

  return normalizeLayout([], page);
}

/** Guarda o layout de uma página sem perder o das outras. */
export function withPageLayout(
  saved: unknown,
  page: LayoutPage,
  layout: DashboardLayoutItem[]
): Record<string, DashboardLayoutItem[]> {
  const base: Record<string, DashboardLayoutItem[]> = {};

  if (Array.isArray(saved)) {
    base.inicio = normalizeLayout(saved, "inicio");
  } else if (saved && typeof saved === "object") {
    for (const key of layoutPages) {
      const value = (saved as Record<string, unknown>)[key];
      if (value) {
        base[key] = normalizeLayout(value, key);
      }
    }
  }

  base[page] = normalizeLayout(layout, page);
  return base;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function nextSize(size: BlockSize, direction: 1 | -1): BlockSize {
  const index = blockSizes.indexOf(size);
  const target = Math.min(blockSizes.length - 1, Math.max(0, index + direction));
  return blockSizes[target];
}
