import { describe, expect, it } from "vitest";
import {
  generateMatchupApiSchema,
  replayMatchupApiSchema,
} from "./apiSchemas";

function input(overrides = {}) {
  return {
    eventName: "api-test",
    participantCount: 8,
    participants: Array.from({ length: 8 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
    })),
    courtCount: 2,
    roundCount: 4,
    ...overrides,
  };
}

describe("matchup API schemas", () => {
  it("accepts the documented generate limits", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        courtCount: 8,
        participantCount: 30,
        participants: Array.from({ length: 30 }, (_, index) => ({
          id: `p${index + 1}`,
          name: `Player ${index + 1}`,
        })),
        roundCount: 20,
      }),
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects values over the documented limits", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        participantCount: 31,
        participants: Array.from({ length: 31 }, (_, index) => ({
          id: `p${index + 1}`,
          name: `Player ${index + 1}`,
        })),
      }),
    );

    expect(parsed.success).toBe(false);
  });

  it("requires seed for replay", () => {
    expect(replayMatchupApiSchema.safeParse(input()).success).toBe(false);
    expect(replayMatchupApiSchema.safeParse(input({ seed: 123 })).success).toBe(true);
  });

  it("defaults matchupMode to standard when omitted", () => {
    const parsed = generateMatchupApiSchema.parse(input());

    expect(parsed.matchFormat).toBe("doubles");
    expect(parsed.matchupMode).toBe("standard");
  });

  it("accepts singles with two participants", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        matchFormat: "singles",
        participantCount: 2,
        participants: [
          { id: "p1", name: "Player 1" },
          { id: "p2", name: "Player 2" },
        ],
        courtCount: 1,
      }),
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects doubles with fewer than four participants", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        matchFormat: "doubles",
        participantCount: 3,
        participants: [
          { id: "p1", name: "Player 1" },
          { id: "p2", name: "Player 2" },
          { id: "p3", name: "Player 3" },
        ],
        courtCount: 1,
      }),
    );

    expect(parsed.success).toBe(false);
  });

  it("accepts gender-aware modes when each participant has gender", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        matchupMode: "mixedDoublesPriority",
        participants: Array.from({ length: 8 }, (_, index) => ({
          id: `p${index + 1}`,
          name: `Player ${index + 1}`,
          gender: index < 4 ? "female" : "male",
        })),
      }),
    );

    expect(parsed.success).toBe(true);
  });

  it("accepts gender-aware modes for replay when each participant has gender", () => {
    const parsed = replayMatchupApiSchema.safeParse(
      input({
        matchupMode: "sameGenderPriority",
        seed: 123,
        participants: Array.from({ length: 8 }, (_, index) => ({
          id: `p${index + 1}`,
          name: `Player ${index + 1}`,
          gender: index % 2 === 0 ? "female" : "male",
        })),
      }),
    );

    expect(parsed.success).toBe(true);
  });

  it("rejects gender-aware modes without participant gender", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        matchupMode: "sameGenderPriority",
      }),
    );

    expect(parsed.success).toBe(false);
  });

  it("keeps singles matchupMode and gender metadata without requiring gender", () => {
    const parsed = generateMatchupApiSchema.safeParse(
      input({
        matchFormat: "singles",
        matchupMode: "mixedDoublesPriority",
        participantCount: 2,
        participants: [
          { id: "p1", name: "Player 1", gender: "female" },
          { id: "p2", name: "Player 2" },
        ],
        courtCount: 1,
      }),
    );

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error("expected singles API schema to parse");
    }

    expect(parsed.data?.matchupMode).toBe("mixedDoublesPriority");
    expect(parsed.data?.participants[0]?.gender).toBe("female");
  });
});
