import { describe, expect, it } from "vitest";

import {
  buildFrame,
  buildWalkRuns,
  pixelPalette,
  spriteHeight,
  spriteWidth,
  toRuns,
  walkFrameCount,
  type PixelGrid
} from "@/lib/pet/pixel-sprite";

/** Refaz a grade a partir das faixas — se bater, a compressão não perdeu pixel. */
function fromRuns(runs: ReturnType<typeof toRuns>): PixelGrid {
  const grid: PixelGrid = Array.from({ length: spriteHeight }, () =>
    new Array<string>(spriteWidth).fill(".")
  );

  for (const run of runs) {
    for (let x = run.x; x < run.x + run.width; x++) {
      grid[run.y][x] = run.color;
    }
  }

  return grid;
}

function paint(grid: PixelGrid): PixelGrid {
  return grid.map((row) => row.map((cell) => (cell === "." ? "." : pixelPalette[cell])));
}

describe("sprite em pixel", () => {
  it("mantém a grade do kit em todos os quadros", () => {
    for (let frame = 0; frame < walkFrameCount; frame++) {
      const grid = buildFrame(frame);

      expect(grid).toHaveLength(spriteHeight);
      expect(grid.every((row) => row.length === spriteWidth)).toBe(true);
    }
  });

  it("só usa cores que existem na paleta", () => {
    const conhecidas = new Set([".", ...Object.keys(pixelPalette)]);

    for (let frame = 0; frame < walkFrameCount; frame++) {
      for (const row of buildFrame(frame)) {
        for (const cell of row) {
          expect(conhecidas.has(cell)).toBe(true);
        }
      }
    }
  });

  it("fecha os olhos no quadro 7 e só nele", () => {
    const temOlho = (frame: number) => buildFrame(frame).some((row) => row.includes("B"));

    expect(temOlho(6)).toBe(false);
    expect([0, 1, 2, 3, 4, 5, 7].every(temOlho)).toBe(true);
  });

  /**
   * O ciclo tem 8 posições, mas 6 desenhos: o kit repete o quadro 4 no 5 e o
   * quadro 8 no 1. A repetição do fim é a emenda do laço, de propósito. A do
   * meio contraria a legenda do próprio kit ("contato espelhado"), e está
   * registrada aqui para a troca aparecer se o designer redesenhar.
   */
  it("mantém as retenções do kit, e nada além delas", () => {
    const assinaturas = Array.from({ length: walkFrameCount }, (_, frame) =>
      buildFrame(frame)
        .map((row) => row.join(""))
        .join("|")
    );

    const repetidos: string[] = [];
    for (let a = 0; a < walkFrameCount; a++) {
      for (let b = a + 1; b < walkFrameCount; b++) {
        if (assinaturas[a] === assinaturas[b]) repetidos.push(`${a}=${b}`);
      }
    }

    expect(repetidos).toEqual(["0=7", "3=4"]);
    expect(new Set(assinaturas).size).toBe(6);
  });

  it("a compressão em faixas não perde nem inventa pixel", () => {
    for (let frame = 0; frame < walkFrameCount; frame++) {
      const grid = buildFrame(frame);
      expect(fromRuns(toRuns(grid))).toEqual(paint(grid));
    }
  });

  it("vale a pena comprimir: menos de 200 faixas por quadro", () => {
    for (const runs of buildWalkRuns()) {
      expect(runs.length).toBeLessThan(200);
      expect(runs.length).toBeGreaterThan(100);
    }
  });

  it("o bicho fica dentro da grade, sem vazar pelas bordas", () => {
    for (const runs of buildWalkRuns()) {
      for (const run of runs) {
        expect(run.x).toBeGreaterThanOrEqual(0);
        expect(run.x + run.width).toBeLessThanOrEqual(spriteWidth);
        expect(run.y).toBeGreaterThanOrEqual(0);
        expect(run.y).toBeLessThan(spriteHeight);
      }
    }
  });
});
