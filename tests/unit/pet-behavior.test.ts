import { describe, expect, it } from "vitest";

import {
  activityDefs,
  advanceBehavior,
  bottomInset,
  chooseBehavior,
  cornerInset,
  createBehavior,
  getIdleChatter,
  interrupt,
  nearestCorner,
  topInset,
  walkSpeed,
  type BehaviorContext,
  type BehaviorState
} from "@/lib/pet/behavior";
import type { PetStats } from "@/lib/pet/state";

const healthy: PetStats = { satiety: 70, energy: 80, affection: 65 };

const floorY = 700 - bottomInset;

function makeContext(overrides: Partial<BehaviorContext> = {}): BehaviorContext {
  return {
    stats: healthy,
    stageWidth: 1000,
    stageHeight: 700,
    toyX: null,
    toyY: null,
    cursorX: null,
    cursorY: null,
    ...overrides
  };
}

function makeState(overrides: Partial<BehaviorState> = {}): BehaviorState {
  return { ...createBehavior(500, floorY, 0), ...overrides };
}

/** Sorteio determinístico: sempre devolve o mesmo valor. */
const fixed = (value: number) => () => value;

describe("escolha de comportamento", () => {
  it("larga tudo para correr atrás do novelo", () => {
    const next = chooseBehavior(makeState(), makeContext({ toyX: 200, toyY: 300 }), 1000, fixed(0.5));

    expect(next.activity).toBe("chase");
    expect(next.targetX).toBe(200);
    expect(next.targetY).toBe(300);
    expect(next.facing).toBe(-1);
  });

  it("mantém o alvo do novelo dentro do palco", () => {
    const next = chooseBehavior(
      makeState(),
      makeContext({ toyX: 9999, toyY: -9999 }),
      1000,
      fixed(0.5)
    );

    expect(next.targetX).toBe(1000 - cornerInset);
    expect(next.targetY).toBe(topInset);
  });

  it("caminha até o canto mais perto quando está sem energia", () => {
    const state = makeState({ x: 800, y: 200 });
    const next = chooseBehavior(
      state,
      makeContext({ stats: { ...healthy, energy: 10 } }),
      1000,
      fixed(0.5)
    );

    expect(next.activity).toBe("walk");
    expect(next.targetX).toBe(1000 - cornerInset);
    expect(next.targetY).toBe(topInset);
    expect(next.facing).toBe(1);
  });

  it("dorme quando já está no canto e sem energia", () => {
    const state = makeState({ x: cornerInset, y: topInset });
    const next = chooseBehavior(
      state,
      makeContext({ stats: { ...healthy, energy: 10 } }),
      1000,
      fixed(0.5)
    );

    expect(next.activity).toBe("sleep");
    expect(activityDefs.sleep.pose).toBe("lie");
  });

  it("sono ganha de fome", () => {
    const next = chooseBehavior(
      makeState({ x: cornerInset, y: topInset }),
      makeContext({ stats: { satiety: 5, energy: 10, affection: 50 } }),
      1000,
      fixed(0.5)
    );

    expect(next.activity).toBe("sleep");
  });

  it("mia sentado quando está faminto", () => {
    const next = chooseBehavior(
      makeState(),
      makeContext({ stats: { ...healthy, satiety: 10 } }),
      1000,
      fixed(0.1)
    );

    expect(next.activity).toBe("beg");
    expect(getIdleChatter("beg", "Nero")).toBe("miau!");
  });

  it("vai na direção do cursor quando o carinho está em dia", () => {
    const next = chooseBehavior(
      makeState({ x: 500, y: 400 }),
      makeContext({ cursorX: 620, cursorY: 360, stats: { ...healthy, affection: 80 } }),
      1000,
      fixed(0.1)
    );

    expect(next.activity).toBe("walk");
    expect(next.targetX).toBe(620);
    expect(next.targetY).toBe(360);
  });

  it("ignora o cursor quando ele está longe demais", () => {
    const next = chooseBehavior(
      makeState({ x: 100, y: 600 }),
      makeContext({ cursorX: 900, cursorY: 150, stats: { ...healthy, affection: 90 } }),
      1000,
      fixed(0.1)
    );

    expect(next.targetX).not.toBe(900);
  });

  it("não repete a atividade parada anterior", () => {
    for (let ticket = 0; ticket < 1; ticket += 0.05) {
      const next = chooseBehavior(makeState({ activity: "groom" }), makeContext(), 1000, fixed(ticket));
      expect(next.activity).not.toBe("groom");
    }
  });

  it("garante um passo mínimo quando o destino sorteado é perto demais", () => {
    // fixed(0.5) sorteia o meio do palco, que é exatamente onde ele já está.
    const middleY = (topInset + (700 - bottomInset)) / 2;
    const next = chooseBehavior(
      makeState({ x: 500, y: middleY, activity: "sit" }),
      makeContext(),
      1000,
      fixed(0.5)
    );

    if (next.activity === "walk") {
      const jump = Math.hypot((next.targetX ?? 500) - 500, (next.targetY ?? middleY) - middleY);
      expect(jump).toBeGreaterThan(70);
    }
  });
});

describe("deslocamento", () => {
  it("anda na velocidade certa e não passa do alvo", () => {
    const state = makeState({ activity: "walk", x: 100, y: 400, targetX: 200, targetY: 400, endsAt: 99_999 });
    const oneSecond = advanceBehavior(state, makeContext(), 1000, 1000);

    expect(oneSecond.state.x).toBe(100 + walkSpeed);
    expect(oneSecond.arrived).toBe(false);
    expect(oneSecond.done).toBe(false);

    const rest = advanceBehavior(oneSecond.state, makeContext(), 3000, 3000);
    expect(rest.state.x).toBe(200);
    expect(rest.arrived).toBe(true);
    expect(rest.done).toBe(true);
  });

  it("anda na diagonal sem acelerar", () => {
    const state = makeState({ activity: "walk", x: 100, y: 250, targetX: 400, targetY: 550, endsAt: 99_999 });
    const after = advanceBehavior(state, makeContext(), 1000, 1000).state;
    const travelled = Math.hypot(after.x - 100, after.y - 250);

    // O passo é o mesmo da horizontal: a velocidade é do vetor, não de cada eixo.
    expect(travelled).toBeCloseTo(walkSpeed, 5);
    expect(after.y).toBeGreaterThan(250);
  });

  it("vira para o lado do alvo", () => {
    const goingLeft = advanceBehavior(
      makeState({ activity: "walk", x: 500, y: 400, targetX: 300, targetY: 400, endsAt: 99_999, facing: 1 }),
      makeContext(),
      1000,
      100
    );

    expect(goingLeft.state.facing).toBe(-1);
  });

  it("alvo quase na vertical não fica virando o gato à toa", () => {
    const straightUp = advanceBehavior(
      makeState({ activity: "walk", x: 500, y: 600, targetX: 503, targetY: 200, endsAt: 99_999, facing: -1 }),
      makeContext(),
      1000,
      100
    );

    expect(straightUp.state.facing).toBe(-1);
  });

  it("atividade parada só termina no tempo, sem sair do lugar", () => {
    const state = makeState({ activity: "groom", x: 400, y: 300, endsAt: 5000 });

    const early = advanceBehavior(state, makeContext(), 4000, 16);
    expect(early.done).toBe(false);
    expect(early.state.x).toBe(400);
    expect(early.state.y).toBe(300);

    const late = advanceBehavior(state, makeContext(), 5001, 16);
    expect(late.done).toBe(true);
  });

  it("corre mais rápido atrás do novelo do que andando", () => {
    const walking = advanceBehavior(
      makeState({ activity: "walk", x: 100, y: 400, targetX: 900, targetY: 400, endsAt: 99_999 }),
      makeContext(),
      1000,
      1000
    );
    const chasing = advanceBehavior(
      makeState({ activity: "chase", x: 100, y: 400, targetX: 900, targetY: 400, endsAt: 99_999 }),
      makeContext(),
      1000,
      1000
    );

    expect(chasing.state.x).toBeGreaterThan(walking.state.x);
  });

  it("não escapa do palco em nenhum dos dois eixos", () => {
    const sideways = advanceBehavior(
      makeState({ activity: "walk", x: 990, y: 400, targetX: 1200, targetY: 400, endsAt: 99_999 }),
      makeContext(),
      1000,
      1000
    );
    const upwards = advanceBehavior(
      makeState({ activity: "walk", x: 500, y: 120, targetX: 500, targetY: -400, endsAt: 99_999 }),
      makeContext(),
      1000,
      1000
    );

    expect(sideways.state.x).toBeLessThanOrEqual(1000 - cornerInset);
    expect(upwards.state.y).toBeGreaterThanOrEqual(topInset);
  });
});

describe("interrupções", () => {
  it("troca a atividade na hora, mantendo a posição", () => {
    const state = makeState({ activity: "walk", x: 321, y: 222, targetX: 800, targetY: 400 });
    const cuddling = interrupt(state, "cuddle", 7000);

    expect(cuddling.activity).toBe("cuddle");
    expect(cuddling.x).toBe(321);
    expect(cuddling.y).toBe(222);
    expect(cuddling.targetX).toBeNull();
    expect(cuddling.targetY).toBeNull();
    expect(cuddling.endsAt).toBe(7000 + activityDefs.cuddle.minMs);
  });
});

describe("cantos", () => {
  it("escolhe entre os quatro cantos da tela", () => {
    const stage = { stageWidth: 1000, stageHeight: 700 };

    expect(nearestCorner({ x: 100, y: 120 }, stage)).toEqual({ x: cornerInset, y: topInset });
    expect(nearestCorner({ x: 900, y: 650 }, stage)).toEqual({
      x: 1000 - cornerInset,
      y: 700 - bottomInset
    });
  });
});
