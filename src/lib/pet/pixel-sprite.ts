/// Sprite 16-bit do Nero — portado do kit "Nero 16-bit" do Claude Designer.
///
/// O desenho não é uma imagem: é uma grade de caracteres de 26 × 25 onde cada
/// letra é uma cor da paleta. Os quadros da caminhada são montados na hora a
/// partir de quatro tabelas — corpo, cauda, patas e o ritmo do ciclo — que é
/// como um sprite de 16 bits é feito de verdade: o corpo comprime 1 px, as
/// patas andam em diagonal e a cauda cruza para o outro lado.
///
/// As tabelas abaixo são as do kit, sem alteração. Quem quiser mexer no desenho
/// mexe aqui; o resto do app não sabe o que é pixel.

export const spriteWidth = 26;
export const spriteHeight = 25;
export const walkFrameCount = 8;

/** As 7 cores. K é o contorno, M o corpo, L o peito, B os olhos, P o focinho. */
export const pixelPalette: Record<string, string> = {
  K: "#271f18",
  D: "#6f625b",
  M: "#7c6e65",
  S: "#b4a899",
  L: "#d1c8b2",
  P: "#e9797c",
  B: "#0b0908"
};

/** Corpo e cabeça, sem cauda e sem patas. A linha 21 é a barriga. */
const upper = [
  "..........................",
  "..........................",
  ".............K.........K..",
  ".............KKK......KK..",
  ".............KSKK....KDSK.",
  ".............KLDK....KDLK.",
  ".............KLDDKKKKKDLK.",
  "............KLLMMMMMMMMLK.",
  "............KDMMMMMMMMMMDK",
  "...........KKKMMMMMMMMMMKK",
  "...........KDDDMMKMLMKMDDK",
  "...........KKKMMMKLLLKMMKK",
  ".........KKKKDMMMBLLLBMMMK",
  "........KSSSKDMMSLLPLLSMK.",
  ".......KSLLLSKDMSSLLLSSK..",
  "........LLLLMMMKKKKKKKK...",
  "........MMLMMMMMMLLLK.....",
  "......KKMMMMMMMMMMLLK.....",
  ".......KMMDMMMMMDMMLK.....",
  ".......KDMDMMMMMDKMMK.....",
  ".......KDMDMMMKMDKDDK.....",
  ".......KKKKKKKKKKKKKK....."
];

const tail = ["..KKK...", "..KSK...", "..KLK...", "..KDMK..", "...KMDK.", "....KDMK", ".....KDK"];
const tailY = 10;

/** Pata no chão (3 linhas) e pata no ar (2 linhas), em três tons. */
const plant: Record<string, string[]> = {
  d: ["KDK", "KDK", ".KK"],
  m: ["KDK", "KSK", ".KK"],
  l: ["KLK", "KSK", ".KK"]
};
const lift: Record<string, string[]> = {
  d: ["KDK", ".KK"],
  m: ["KSK", ".KK"],
  l: ["KSK", ".KK"]
};

/** Compressão do corpo, deslocamento da cauda e o quadro em que ele pisca. */
const bob = [0, 1, 1, 0, 0, 1, 1, 0];
const tailDx = [0, 1, 1, 0, 0, -1, -1, 0];
const blinkFrame = 6;

/** O ritmo da pata: em que quadro ela sai do chão e quanto avança. */
const cycle = [
  { dx: 0, lift: false },
  { dx: 0, lift: true },
  { dx: 1, lift: true },
  { dx: 1, lift: false },
  { dx: 1, lift: false },
  { dx: 0, lift: false },
  { dx: 0, lift: false },
  { dx: 0, lift: false }
];

/** As quatro patas, cada uma entrando no ciclo em uma fase diferente. */
const legs = [
  { x: 7, phase: 0, tone: "d" },
  { x: 11, phase: 4, tone: "d" },
  { x: 14, phase: 4, tone: "m" },
  { x: 18, phase: 0, tone: "l" }
];

export type PixelGrid = string[][];

/** Monta a grade de um quadro do ciclo (0 a 7). */
export function buildFrame(frame: number): PixelGrid {
  const grid: PixelGrid = [];

  for (let y = 0; y < spriteHeight; y++) {
    grid.push(new Array<string>(spriteWidth).fill("."));
  }

  const put = (x: number, y: number, color: string) => {
    if (color !== "." && x >= 0 && x < spriteWidth && y >= 0 && y < spriteHeight) {
      grid[y][x] = color;
    }
  };

  const lifted = bob[frame];
  const blinking = frame === blinkFrame;

  upper.forEach((row, y) => {
    // A barriga não sobe junto: é ela que mantém o bicho colado no chão.
    const targetY = y === 21 ? 21 : y + lifted;

    for (let x = 0; x < row.length; x++) {
      const color = row[x] === "B" && blinking ? "M" : row[x];
      put(x, targetY, color);
    }
  });

  tail.forEach((row, i) => {
    const dx = i < 3 ? tailDx[frame] : 0;
    for (let x = 0; x < row.length; x++) {
      put(x + dx, tailY + i + lifted, row[x]);
    }
  });

  legs.forEach((leg) => {
    const step = cycle[(frame + leg.phase) % walkFrameCount];
    const stamp = step.lift ? lift[leg.tone] : plant[leg.tone];

    stamp.forEach((row, i) => {
      for (let x = 0; x < 3; x++) {
        put(leg.x + step.dx + x, 21 + i, row[x]);
      }
    });
  });

  return grid;
}

export type PixelRun = { x: number; y: number; width: number; color: string };

/**
 * Junta pixels vizinhos da mesma cor numa faixa só.
 *
 * Sem isto seriam ~370 retângulos por quadro no DOM; com isto ficam ~170, e o
 * desenho é exatamente o mesmo.
 */
export function toRuns(grid: PixelGrid): PixelRun[] {
  const runs: PixelRun[] = [];

  for (let y = 0; y < grid.length; y++) {
    let x = 0;

    while (x < grid[y].length) {
      const key = grid[y][x];

      if (key === ".") {
        x++;
        continue;
      }

      let width = 1;
      while (x + width < grid[y].length && grid[y][x + width] === key) {
        width++;
      }

      runs.push({ x, y, width, color: pixelPalette[key] });
      x += width;
    }
  }

  return runs;
}

/** Os 8 quadros da caminhada, já em faixas prontas para virar `<rect>`. */
export function buildWalkRuns(): PixelRun[][] {
  return Array.from({ length: walkFrameCount }, (_, frame) => toRuns(buildFrame(frame)));
}
