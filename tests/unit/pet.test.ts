import { describe, expect, it } from "vitest";

import {
  applyElapsedTime,
  applyPetAction,
  getAvailableTreats,
  getCooldownRemainingMs,
  getPetMood,
  getTreatAllowance,
  getWellbeing,
  maxDailyTreats,
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

describe("pet treats", () => {
  it("gives one free treat per day plus one per activity", () => {
    expect(getTreatAllowance({ activitiesToday: 0 })).toBe(1);
    expect(getTreatAllowance({ activitiesToday: 3 })).toBe(4);
  });

  it("caps the daily allowance", () => {
    expect(getTreatAllowance({ activitiesToday: 50 })).toBe(maxDailyTreats);
  });

  it("discounts what was already used today", () => {
    expect(getAvailableTreats({ activitiesToday: 2 }, 2)).toBe(1);
    expect(getAvailableTreats({ activitiesToday: 0 }, 5)).toBe(0);
  });
});

describe("pet actions", () => {
  it("feeds the pet and spends one treat", () => {
    const result = applyPetAction({
      state: makeState({ satiety: 40 }),
      action: "FEED",
      now: base,
      signals: makeSignals({ activitiesToday: 1 }),
      treatsUsedToday: 0,
      petName: "Nero"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.satiety).toBe(68);
    expect(result.treatsSpent).toBe(1);
    expect(result.state.lastFedAt).toEqual(base);
  });

  it("refuses to feed without treats left", () => {
    const result = applyPetAction({
      state: makeState({ satiety: 20 }),
      action: "FEED",
      now: base,
      signals: makeSignals(),
      treatsUsedToday: 1,
      petName: "Nero"
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("petiscos");
  });

  it("refuses to feed a stuffed pet even with treats available", () => {
    const result = applyPetAction({
      state: makeState({ satiety: 95 }),
      action: "FEED",
      now: base,
      signals: makeSignals({ activitiesToday: 3 }),
      treatsUsedToday: 0,
      petName: "Nero"
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("empanturrado");
  });

  it("trades energy for affection when playing", () => {
    const result = applyPetAction({
      state: makeState(),
      action: "PLAY",
      now: base,
      signals: makeSignals(),
      treatsUsedToday: 0,
      petName: "Nero"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.affection).toBe(74);
    expect(result.state.energy).toBe(64);
    expect(result.state.satiety).toBe(64);
    expect(result.treatsSpent).toBe(0);
  });

  it("refuses to play when the pet is exhausted", () => {
    const result = applyPetAction({
      state: makeState({ energy: 10 }),
      action: "PLAY",
      now: base,
      signals: makeSignals(),
      treatsUsedToday: 0,
      petName: "Nero"
    });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("sem energia");
  });

  it("blocks an action still on cooldown", () => {
    const state = makeState({ lastPettedAt: base });
    const result = applyPetAction({
      state,
      action: "PET",
      now: new Date(base.getTime() + 10_000),
      signals: makeSignals(),
      treatsUsedToday: 0,
      petName: "Nero"
    });

    expect(result.ok).toBe(false);
    expect(getCooldownRemainingMs(state, "PET", new Date(base.getTime() + 10_000))).toBe(35_000);
  });

  it("releases the action once the cooldown is over", () => {
    const state = makeState({ lastPlayedAt: base });
    const later = new Date(base.getTime() + 16 * 60_000);

    expect(getCooldownRemainingMs(state, "PLAY", later)).toBe(0);
    expect(
      applyPetAction({
        state,
        action: "PLAY",
        now: later,
        signals: makeSignals(),
        treatsUsedToday: 0,
        petName: "Nero"
      }).ok
    ).toBe(true);
  });

  it("ages the meters before applying the action", () => {
    const result = applyPetAction({
      state: makeState({ affection: 50 }),
      action: "PET",
      now: hoursLater(10),
      signals: makeSignals(),
      treatsUsedToday: 0,
      petName: "Nero"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 50 - 30 de decaimento + 7 do carinho.
    expect(result.state.affection).toBe(27);
    expect(result.state.syncedAt).toEqual(hoursLater(10));
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
