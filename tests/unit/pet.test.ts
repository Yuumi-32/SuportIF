import { describe, expect, it } from "vitest";

import {
  applyElapsedTime,
  applyPetAction,
  getPetMood,
  getWellbeing,
  type PetAction,
  type PetState,
  type StudySignals
} from "@/lib/pet/state";

const base = new Date("2026-08-01T12:00:00.000Z");

function makeState(overrides: Partial<PetState> = {}): PetState {
  return {
    satiety: 70,
    energy: 80,
    affection: 60,
    syncedAt: base,
    lastFedAt: null,
    lastPlayedAt: null,
    lastPettedAt: null,
    ...overrides
  };
}

function makeSignals(overrides: Partial<StudySignals> = {}): StudySignals {
  return { streak: 0, level: 1, activitiesToday: 0, overdueReviews: 0, ...overrides };
}

const hoursLater = (hours: number) => new Date(base.getTime() + hours * 60 * 60 * 1000);

describe("pet decay", () => {
  it("keeps the stats untouched when no time passed", () => {
    expect(applyElapsedTime(makeState(), base)).toEqual({ satiety: 70, energy: 80, affection: 60 });
  });

  it("drops satiety and affection while energy recovers", () => {
    const stats = applyElapsedTime(makeState({ energy: 40 }), hoursLater(4));

    expect(stats.satiety).toBe(50);
    expect(stats.affection).toBe(48);
    expect(stats.energy).toBe(68);
  });

  it("never starves the pet completely, no matter how long the absence", () => {
    const stats = applyElapsedTime(makeState(), hoursLater(24 * 30));

    expect(stats.satiety).toBe(8);
    expect(stats.affection).toBe(5);
    expect(stats.energy).toBe(100);
  });

  it("decays slower when the study streak is alive", () => {
    const withoutStreak = applyElapsedTime(makeState(), hoursLater(6), 0);
    const withStreak = applyElapsedTime(makeState(), hoursLater(6), 7);

    expect(withStreak.satiety).toBeGreaterThan(withoutStreak.satiety);
    expect(withStreak.satiety).toBe(52);
  });

  it("averages the three meters into wellbeing", () => {
    expect(getWellbeing({ satiety: 60, energy: 80, affection: 40 })).toBe(60);
  });
});

function care(
  action: PetAction,
  state: PetState,
  options: { now?: Date; treatsGivenToday?: number; signals?: StudySignals } = {}
) {
  return applyPetAction({
    state,
    action,
    now: options.now ?? base,
    signals: options.signals ?? makeSignals(),
    treatsGivenToday: options.treatsGivenToday ?? 0,
    petName: "Nero"
  });
}

describe("pet actions", () => {
  it("feeds the pet and counts the treat", () => {
    const result = care("FEED", makeState({ satiety: 40 }));

    expect(result.state.satiety).toBe(68);
    expect(result.treatsGiven).toBe(1);
    expect(result.state.lastFedAt).toEqual(base);
  });

  it("trades energy for affection when playing", () => {
    const result = care("PLAY", makeState());

    expect(result.state.affection).toBe(74);
    expect(result.state.energy).toBe(64);
    expect(result.state.satiety).toBe(64);
    expect(result.treatsGiven).toBe(0);
  });

  it("ages the meters before applying the action", () => {
    const result = care("PET", makeState({ affection: 50 }), { now: hoursLater(10) });

    // 50 - 30 de decaimento + 7 do carinho.
    expect(result.state.affection).toBe(27);
    expect(result.state.syncedAt).toEqual(hoursLater(10));
  });
});

describe("cuidar é ilimitado", () => {
  it("aceita a mesma ação em sequência, sem espera", () => {
    let state = makeState({ affection: 10 });

    for (let i = 0; i < 5; i++) {
      state = care("PET", state).state;
    }

    // Cinco carinhos seguidos no mesmo instante: nenhum foi recusado.
    expect(state.affection).toBe(45);
  });

  it("alimenta um bicho já cheio, sem recusar", () => {
    const result = care("FEED", makeState({ satiety: 95 }));

    expect(result.treatsGiven).toBe(1);
    // O medidor é o único limite: ele para em 100.
    expect(result.state.satiety).toBe(100);
  });

  it("brinca mesmo esgotado, sem recusar", () => {
    const result = care("PLAY", makeState({ energy: 10 }));

    expect(result.state.energy).toBe(0);
    expect(result.state.affection).toBe(74);
  });

  it("não depende de quantos petiscos já saíram hoje", () => {
    const primeiro = care("FEED", makeState({ satiety: 40 }), { treatsGivenToday: 0 });
    const centesimo = care("FEED", makeState({ satiety: 40 }), { treatsGivenToday: 99 });

    expect(centesimo.state.satiety).toBe(primeiro.state.satiety);
    expect(centesimo.treatsGiven).toBe(1);
  });

  it("não depende de estudo nenhum para funcionar", () => {
    const semEstudo = care("FEED", makeState({ satiety: 40 }), {
      signals: makeSignals({ activitiesToday: 0, streak: 0 })
    });

    expect(semEstudo.treatsGiven).toBe(1);
    expect(semEstudo.state.satiety).toBe(68);
  });
});

describe("pet mood", () => {
  const healthy = { satiety: 80, energy: 80, affection: 80 };

  it("puts urgent needs before study signals", () => {
    expect(getPetMood({ ...healthy, satiety: 20 }, makeSignals({ overdueReviews: 3 }))).toBe("hungry");
    expect(getPetMood({ ...healthy, energy: 10 }, makeSignals({ activitiesToday: 2 }))).toBe("sleepy");
    expect(getPetMood({ ...healthy, affection: 10 }, makeSignals())).toBe("lonely");
  });

  it("worries about overdue reviews once the needs are met", () => {
    expect(getPetMood(healthy, makeSignals({ overdueReviews: 1 }))).toBe("worried");
  });

  it("celebrates study done today", () => {
    expect(getPetMood(healthy, makeSignals({ activitiesToday: 1, streak: 4 }))).toBe("proud");
  });

  it("falls back to playful and content", () => {
    expect(getPetMood(healthy, makeSignals())).toBe("playful");
    expect(getPetMood({ satiety: 60, energy: 50, affection: 50 }, makeSignals())).toBe("content");
  });
});
