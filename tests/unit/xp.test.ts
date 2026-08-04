import { describe, expect, it } from "vitest";

import { buildXpDedupeKey, calculateLevel, canGrantXp } from "@/lib/xp/level";

describe("xp rules", () => {
  it("calculates level from total XP", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(249)).toBe(1);
    expect(calculateLevel(250)).toBe(2);
    expect(calculateLevel(760)).toBe(4);
  });

  it("prevents repeated XP grants with the same dedupe key", () => {
    const key = buildXpDedupeKey("user-1", "MISSION_COMPLETED", "mission-1");
    expect(canGrantXp(new Set(), key)).toBe(true);
    expect(canGrantXp(new Set([key]), key)).toBe(false);
  });

  it("uses a stable dedupe key for simulation completion", () => {
    const key = buildXpDedupeKey("user-1", "SIMULATION_COMPLETED", "simulation-1");
    expect(key).toBe("user-1:SIMULATION_COMPLETED:simulation-1");
    expect(canGrantXp(new Set([key]), key)).toBe(false);
  });
});
