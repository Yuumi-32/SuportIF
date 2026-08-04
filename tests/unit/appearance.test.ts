import { describe, expect, it } from "vitest";

import { defaultAppearance, parseAppearance, type AppearanceSettings } from "@/lib/appearance/settings";
import {
  buildAccentRamp,
  buildAppearanceCss,
  buildNeutralRamp,
  hexToHsl,
  hslToHex,
  resolveAppearance
} from "@/lib/appearance/tokens";

function withSettings(patch: Partial<AppearanceSettings>): AppearanceSettings {
  return { ...defaultAppearance, ...patch };
}

describe("appearance parsing", () => {
  it("falls back to the default theme for garbage input", () => {
    expect(parseAppearance(null)).toEqual(defaultAppearance);
    expect(parseAppearance("nao é um objeto")).toEqual(defaultAppearance);
    expect(parseAppearance({ level: "HACK", radiusPx: 9999 })).toEqual(defaultAppearance);
  });

  it("keeps valid fields and repairs invalid ones", () => {
    const parsed = parseAppearance({ level: "ADVANCED", radiusPx: 500, accent: "#ff0000" });

    expect(parsed.level).toBe("ADVANCED");
    expect(parsed.accent).toBe("#ff0000");
    expect(parsed.radiusPx).toBe(defaultAppearance.radiusPx);
  });

  it("rejects a color that is not a hex value", () => {
    expect(parseAppearance({ accent: "javascript:alert(1)" }).accent).toBeNull();
  });
});

describe("color helpers", () => {
  it("converts hex to hsl and back", () => {
    expect(hexToHsl("#6d28d9")).toEqual({ h: 263.4, s: 70, l: 50.4 });
    expect(hslToHex({ h: 263.4, s: 70, l: 50.4 })).toBe("#6d28d9");
  });

  it("builds a ramp that goes from light to dark", () => {
    const ramp = buildAccentRamp("#1d4ed8");

    expect(ramp).toHaveLength(11);
    expect(ramp[0].l).toBeGreaterThan(ramp[10].l);
    expect(ramp[7].h).toBeCloseTo(hexToHsl("#1d4ed8").h, 0);
  });

  it("keeps a grey accent grey across the whole ramp", () => {
    const ramp = buildAccentRamp("#334155");

    expect(Math.max(...ramp.map((tone) => tone.s))).toBeLessThan(40);
  });

  it("inverts the neutral ramp in dark mode", () => {
    const light = buildNeutralRamp(false);
    const dark = buildNeutralRamp(true);

    expect(dark[0]).toEqual(light[10]);
    expect(dark[10]).toEqual(light[0]);
  });
});

describe("level depth", () => {
  it("ignores intermediate and advanced fields while the level is simple", () => {
    const resolved = resolveAppearance(
      withSettings({ accent: "#ff0000", radiusPx: 24, fontSizePx: 20, animations: false })
    );

    expect(resolved.accentHex).toBe("#6d28d9");
    expect(resolved.radiusPx).toBe(8);
    expect(resolved.fontSizePx).toBe(16);
    expect(resolved.animations).toBe(true);
  });

  it("applies the custom accent from the intermediate level onwards", () => {
    const resolved = resolveAppearance(
      withSettings({ level: "INTERMEDIATE", accent: "#ff0000", radiusPx: 24 })
    );

    expect(resolved.accentHex).toBe("#ff0000");
    // radiusPx é do nível avançado, então aqui ainda vale a escolha de "cantos".
    expect(resolved.radiusPx).toBe(8);
  });

  it("applies exact token values on the advanced level", () => {
    const resolved = resolveAppearance(
      withSettings({ level: "ADVANCED", radiusPx: 24, fontSizePx: 20, animations: false })
    );

    expect(resolved.radiusPx).toBe(24);
    expect(resolved.fontSizePx).toBe(20);
    expect(resolved.animations).toBe(false);
  });

  it("switches the text to a light tone over a dark surface", () => {
    const light = resolveAppearance(defaultAppearance);
    const dark = resolveAppearance(withSettings({ theme: "DARK" }));

    expect(light.textHsl.l).toBeLessThan(20);
    expect(dark.textHsl.l).toBeGreaterThan(80);
  });
});

describe("generated css", () => {
  it("declares the full scale, radius and root font size", () => {
    const css = buildAppearanceCss(defaultAppearance);

    expect(css).toContain("--violet-700:");
    expect(css).toContain("--slate-200:");
    expect(css).toContain("--radius:8px");
    expect(css).toContain("font-size:16px");
  });

  it("only overrides bg-white when the card color is not white", () => {
    expect(buildAppearanceCss(defaultAppearance)).not.toContain(".bg-white");
    expect(buildAppearanceCss(withSettings({ theme: "DARK" }))).toContain(".bg-white");
  });

  it("cuts animations when the user asks for reduced motion", () => {
    const css = buildAppearanceCss(withSettings({ level: "ADVANCED", animations: false }));

    expect(css).toContain("transition:none!important");
  });
});
