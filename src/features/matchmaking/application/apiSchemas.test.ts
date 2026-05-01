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
});

