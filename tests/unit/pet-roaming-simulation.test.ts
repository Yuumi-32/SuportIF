import { describe, expect, it } from "vitest";

import {
  advanceBehavior,
  bottomInset,
  chooseBehavior,
  cornerInset,
  createBehavior,
  topInset,
  type BehaviorContext,
  type BehaviorState,
  type PetActivity
} from "@/lib/pet/behavior";
import type { PetStats } from "@/lib/pet/state";

/**
 * O laço de verdade vive no rAF do navegador, que não existe aqui. Esta é a
 * mesma sequência de chamadas em tempo simulado: é o que garante que "andar,
 * cansar, dormir no canto" é comportamento que emerge, e não teoria.
 */
function simulate(options: {
  stats: PetStats;
  seconds: number;
  stageWidth?: number;
  stageHeight?: number;
  toy?: { x: number; y: number } | null;
  seed?: number;
  frameMs?: number;
}) {
  const stageWidth = options.stageWidth ?? 1200;
  const stageHeight = options.stageHeight ?? 800;
  const frameMs = options.frameMs ?? 16;

  const context: BehaviorContext = {
    stats: options.stats,
    stageWidth,
    stageHeight,
    toyX: options.toy ? options.toy.x : null,
    toyY: options.toy ? options.toy.y : null,
    cursorX: null,
    cursorY: null
  };

  // Sorteio determinístico (LCG) para o teste não depender de Math.random.
  let seed = options.seed ?? 1;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  let state: BehaviorState = createBehavior(stageWidth / 2, stageHeight - bottomInset, 0);
  const activities: PetActivity[] = [state.activity];
  const xs: number[] = [state.x];
  const ys: number[] = [state.y];
  let arrivals = 0;

  for (let time = frameMs; time <= options.seconds * 1000; time += frameMs) {
    const result = advanceBehavior(state, context, time, frameMs);
    state = result.state;
    xs.push(state.x);
    ys.push(state.y);

    if (result.arrived) {
      arrivals += 1;
    }

    if (result.done) {
      state = chooseBehavior(state, context, time, random);

      if (state.activity !== activities[activities.length - 1]) {
        activities.push(state.activity);
      }
    }
  }

  return {
    activities,
    xs,
    ys,
    arrivals,
    finalState: state,
    distinctActivities: new Set(activities),
    travelledX: Math.max(...xs) - Math.min(...xs),
    travelledY: Math.max(...ys) - Math.min(...ys)
  };
}

const healthy: PetStats = { satiety: 70, energy: 80, affection: 65 };

describe("passeio ao longo do tempo", () => {
  it("um gato saudável anda pela tela e troca de atividade sozinho", () => {
    const run = simulate({ stats: healthy, seconds: 120 });

    expect(run.activities.length).toBeGreaterThan(8);
    expect(run.distinctActivities.size).toBeGreaterThanOrEqual(4);
    expect(run.travelledX).toBeGreaterThan(300);
  });

  it("usa a tela toda, não só a faixa de baixo", () => {
    const run = simulate({ stats: healthy, seconds: 180, stageHeight: 800 });
    const usableHeight = 800 - bottomInset - topInset;

    // Sobe pelo menos metade da altura útil ao longo do passeio.
    expect(run.travelledY).toBeGreaterThan(usableHeight / 2);
    expect(Math.min(...run.ys)).toBeLessThan(400);
  });

  it("nunca sai do palco, em nenhum quadro, em nenhum eixo", () => {
    const run = simulate({ stats: healthy, seconds: 180, stageWidth: 900, stageHeight: 600 });

    expect(Math.min(...run.xs)).toBeGreaterThanOrEqual(cornerInset);
    expect(Math.max(...run.xs)).toBeLessThanOrEqual(900 - cornerInset);
    expect(Math.min(...run.ys)).toBeGreaterThanOrEqual(topInset);
    expect(Math.max(...run.ys)).toBeLessThanOrEqual(600 - bottomInset);
  });

  it("cansado, ele termina dormindo num dos quatro cantos", () => {
    const run = simulate({ stats: { ...healthy, energy: 8 }, seconds: 90 });

    expect(run.finalState.activity).toBe("sleep");
    expect([cornerInset, 1200 - cornerInset]).toContain(run.finalState.x);
    expect([topInset, 800 - bottomInset]).toContain(run.finalState.y);
    // Só dorme: não fica alternando com outras atividades.
    expect(run.distinctActivities.has("groom")).toBe(false);
  });

  it("faminto, insiste em pedir comida em vez de passear", () => {
    const run = simulate({ stats: { ...healthy, satiety: 8 }, seconds: 120 });
    const begs = run.activities.filter((activity) => activity === "beg").length;

    expect(begs).toBeGreaterThan(3);
    expect(run.travelledX).toBe(0);
    expect(run.travelledY).toBe(0);
  });

  it("com novelo na tela, ele chega até o brinquedo onde quer que esteja", () => {
    const run = simulate({ stats: healthy, seconds: 30, toy: { x: 1000, y: 200 } });

    expect(run.finalState.activity).toBe("chase");
    expect(run.finalState.x).toBe(1000);
    expect(run.finalState.y).toBe(200);
    expect(run.arrivals).toBeGreaterThan(0);
  });

  it("o resultado não depende da taxa de quadros", () => {
    const smooth = simulate({ stats: healthy, seconds: 60, frameMs: 16, seed: 7 });
    const choppy = simulate({ stats: healthy, seconds: 60, frameMs: 50, seed: 7 });

    // Quadro mais grosso muda o arredondamento, não o roteiro.
    expect(choppy.activities.slice(0, 6)).toEqual(smooth.activities.slice(0, 6));
    expect(Math.abs(choppy.travelledX - smooth.travelledX)).toBeLessThan(60);
  });
});
