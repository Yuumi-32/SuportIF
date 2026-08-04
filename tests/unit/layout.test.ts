import { describe, expect, it } from "vitest";

import {
  blockBox,
  defaultLayouts,
  isFreeCanvas,
  moveItem,
  nextSize,
  normalizeLayout,
  pageLayout,
  sizeFromWidth,
  withBox,
  withPageLayout,
  type DashboardLayoutItem
} from "@/lib/appearance/layout";
import { defaultAppearance, parseAppearance } from "@/lib/appearance/settings";
import { buildAppearanceCss, resolveAppearance } from "@/lib/appearance/tokens";

describe("free layout", () => {
  it("starts from the standard layout when nothing was saved", () => {
    expect(normalizeLayout(null)).toEqual(defaultLayouts.inicio);
    expect(normalizeLayout("lixo", "trilhas")).toEqual(defaultLayouts.trilhas);
  });

  it("keeps the saved order and appends blocks the user has never seen", () => {
    const saved: DashboardLayoutItem[] = [
      { id: "reviews", size: "P", hidden: false },
      { id: "hero", size: "M", hidden: true }
    ];

    const result = normalizeLayout(saved);

    expect(result.slice(0, 2)).toEqual(saved);
    expect(result).toHaveLength(defaultLayouts.inicio.length);
    expect(result.map((item) => item.id)).toContain("simulation");
  });

  it("drops duplicates and blocks that belong to another page", () => {
    const result = normalizeLayout([
      { id: "hero", size: "G", hidden: false },
      { id: "hero", size: "P", hidden: true },
      { id: "sims-list", size: "G", hidden: false }
    ]);

    expect(result.filter((item) => item.id === "hero")).toHaveLength(1);
    expect(result.map((item) => item.id)).not.toContain("sims-list");
    expect(result).toHaveLength(defaultLayouts.inicio.length);
  });

  it("moves a block without losing the others", () => {
    const ids = ["a", "b", "c", "d"];

    expect(moveItem(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(ids, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(ids, 0, -1)).toEqual(ids);
    expect(moveItem(ids, 3, 4)).toEqual(ids);
  });

  it("clamps the size at both ends", () => {
    expect(nextSize("P", -1)).toBe("P");
    expect(nextSize("P", 1)).toBe("M");
    expect(nextSize("G", 1)).toBe("G");
    expect(nextSize("G", -1)).toBe("M");
  });
});

describe("layout per page", () => {
  it("reads the layout of each page independently", () => {
    const saved = {
      inicio: [{ id: "stats", size: "P", hidden: false }],
      revisoes: [{ id: "reviews-list", size: "M", hidden: false }]
    };

    expect(pageLayout(saved, "inicio")[0]).toEqual({ id: "stats", size: "P", hidden: false });
    expect(pageLayout(saved, "revisoes")[0]).toEqual({
      id: "reviews-list",
      size: "M",
      hidden: false
    });
    expect(pageLayout(saved, "simulados")).toEqual(defaultLayouts.simulados);
  });

  it("treats the old format (a plain list) as the home page layout", () => {
    const legacy = [{ id: "badges", size: "G", hidden: false }];

    expect(pageLayout(legacy, "inicio")[0]).toEqual({ id: "badges", size: "G", hidden: false });
    expect(pageLayout(legacy, "trilhas")).toEqual(defaultLayouts.trilhas);
  });

  it("saves one page without touching the others", () => {
    const saved = withPageLayout(
      { inicio: [{ id: "hero", size: "P", hidden: false }] },
      "simulados",
      [{ id: "sims-list", size: "M", hidden: false }]
    );

    expect(saved.inicio[0]).toEqual({ id: "hero", size: "P", hidden: false });
    expect(saved.simulados[0]).toEqual({ id: "sims-list", size: "M", hidden: false });
  });

  it("migrates the old format when saving another page", () => {
    const saved = withPageLayout([{ id: "hero", size: "P", hidden: false }], "trilhas", [
      { id: "tracks-stats", size: "P", hidden: true }
    ]);

    expect(saved.inicio[0]).toEqual({ id: "hero", size: "P", hidden: false });
    expect(saved.trilhas[0]).toEqual({ id: "tracks-stats", size: "P", hidden: true });
  });

  it("survives a round trip through the appearance schema", () => {
    const parsed = parseAppearance({
      freeLayout: true,
      layout: { simulados: [{ id: "sims-stats", size: "P", hidden: true }] }
    });

    expect(parsed.freeLayout).toBe(true);
    expect(pageLayout(parsed.layout, "simulados")[0]).toEqual({
      id: "sims-stats",
      size: "P",
      hidden: true
    });
  });
});

describe("free canvas", () => {
  const boxed = (id: string, w: number): DashboardLayoutItem =>
    withBox({ id, size: "M", hidden: false }, { x: 10, y: 20, w, h: 300 });

  it("only treats the page as free when every visible block has a box", () => {
    const mixed = [boxed("hero", 800), { id: "stats", size: "G", hidden: false } as DashboardLayoutItem];

    expect(isFreeCanvas(mixed)).toBe(false);
    expect(isFreeCanvas([boxed("hero", 800), boxed("stats", 400)])).toBe(true);
  });

  it("ignores hidden blocks when deciding if the canvas is free", () => {
    const items = [boxed("hero", 800), { id: "stats", size: "G", hidden: true } as DashboardLayoutItem];

    expect(isFreeCanvas(items)).toBe(true);
  });

  it("derives the detail level from the width", () => {
    expect(sizeFromWidth(300)).toBe("P");
    expect(sizeFromWidth(500)).toBe("M");
    expect(sizeFromWidth(900)).toBe("G");
  });

  it("keeps size in sync with the width while resizing", () => {
    expect(boxed("hero", 300).size).toBe("P");
    expect(boxed("hero", 900).size).toBe("G");
  });

  it("rounds the coordinates it stores", () => {
    const item = withBox({ id: "hero", size: "M", hidden: false }, { x: 10.4, y: 20.6, w: 300.5, h: 99.2 });

    expect(blockBox(item)).toEqual({ x: 10, y: 21, w: 301, h: 99 });
  });

  it("survives the round trip through the schema without losing the position", () => {
    const parsed = parseAppearance({
      layout: { trilhas: [{ id: "tracks-stats", size: "M", hidden: false, x: 40, y: 80, w: 420, h: 260 }] }
    });

    expect(blockBox(pageLayout(parsed.layout, "trilhas")[0])).toEqual({ x: 40, y: 80, w: 420, h: 260 });
  });

  it("places a brand new block below the others instead of collapsing the canvas", () => {
    const saved = defaultLayouts.inicio
      .slice(0, -1)
      .map((item, index) => withBox(item, { x: 0, y: index * 300, w: 900, h: 260 }));

    const result = normalizeLayout(saved, "inicio");
    const added = result[result.length - 1];

    expect(result).toHaveLength(defaultLayouts.inicio.length);
    expect(isFreeCanvas(result)).toBe(true);
    expect(blockBox(added)?.y).toBeGreaterThan(blockBox(saved[saved.length - 1])!.y);
  });

  it("drops a broken coordinate instead of breaking the page", () => {
    const parsed = parseAppearance({
      layout: [{ id: "hero", size: "M", hidden: false, x: 10, y: 20, w: 5, h: 300 }]
    });

    // Largura fora da faixa é descartada, então o bloco volta para a grade.
    expect(blockBox(pageLayout(parsed.layout, "inicio")[0])).toBeNull();
  });
});

describe("dark surfaces", () => {
  it("turns the light end of the accent palette into dark tints", () => {
    const light = resolveAppearance(defaultAppearance);
    const dark = resolveAppearance({ ...defaultAppearance, theme: "DARK" });

    expect(light.accentRamp[0].l).toBeGreaterThan(90);
    expect(dark.accentRamp[0].l).toBeLessThan(20);
    // Os tons de preenchimento continuam iguais: botão de marca com texto branco.
    expect(dark.accentRamp[8]).toEqual(light.accentRamp[8]);
  });

  it("lightens brand text so it stays readable over dark surfaces", () => {
    const css = buildAppearanceCss({ ...defaultAppearance, theme: "DARK" });

    expect(css).toContain(".text-violet-800");
    expect(css).toContain("--brand-ink:");
    expect(buildAppearanceCss(defaultAppearance)).not.toContain(".text-violet-800");
  });

  it("adapts to a dark surface chosen manually on the advanced level", () => {
    const resolved = resolveAppearance({
      ...defaultAppearance,
      level: "ADVANCED",
      surfaceColor: "#101014",
      cardColor: "#1b1b22"
    });

    expect(resolved.isDark).toBe(true);
    expect(resolved.accentRamp[0].l).toBeLessThan(20);
    expect(resolved.textHsl.l).toBeGreaterThan(80);
  });
});
