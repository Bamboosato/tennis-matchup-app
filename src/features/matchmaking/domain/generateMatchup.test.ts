import { describe, expect, it } from "vitest";
import type { MatchConditions } from "../model/types";
import { generateMatchup } from "./generateMatchup";

function conditions(participantCount: number, courtCount: number, roundCount: number): MatchConditions {
  return {
    eventName: "test",
    participants: Array.from({ length: participantCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      index,
    })),
    courtCount,
    roundCount,
    playersPerCourt: 4,
  };
}

describe("generateMatchup", () => {
  it("keeps rest counts fair and avoids consecutive rest for 5 players over 5 rounds", () => {
    const result = generateMatchup(conditions(5, 1, 5), 20260420);

    expect(result.rounds).toHaveLength(5);

    for (const round of result.rounds) {
      expect(round.activePlayerIds).toHaveLength(4);
      expect(round.restPlayerIds).toHaveLength(1);
    }

    const restCounts = result.stats.map((stat) => stat.rests);
    expect(Math.max(...restCounts) - Math.min(...restCounts)).toBeLessThanOrEqual(1);

    for (const stat of result.stats) {
      expect(stat.consecutiveRestCount).toBe(0);
    }
  });

  it("fills unused courts when participant count cannot use every requested court", () => {
    const result = generateMatchup(conditions(7, 2, 2), 777);

    for (const round of result.rounds) {
      expect(round.activePlayerIds).toHaveLength(4);
      expect(round.restPlayerIds).toHaveLength(3);
      expect(round.courts).toHaveLength(2);
      expect(round.courts.filter((court) => court.isUnused)).toHaveLength(1);
    }
  });

  it("keeps 4-player rounds fully active with no rests", () => {
    const result = generateMatchup(conditions(4, 1, 3), 99);

    for (const round of result.rounds) {
      expect(round.restPlayerIds).toHaveLength(0);
      expect(round.activePlayerIds).toHaveLength(4);
      expect(round.courts[0]?.isUnused).toBe(false);
    }

    for (const stat of result.stats) {
      expect(stat.rests).toBe(0);
      expect(stat.appearances).toBe(3);
    }
  });
});
