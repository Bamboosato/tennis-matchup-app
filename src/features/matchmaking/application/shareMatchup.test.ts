import { describe, expect, it } from "vitest";
import { generateMatchupUseCase } from "./generateMatchupUseCase";
import {
  buildSharedMatchUrl,
  createAutoMatchConditionInput,
  restoreSharedMatchupFromSearch,
} from "./shareMatchup";

describe("shareMatchup", () => {
  it("builds a share URL that restores the same matchup result", () => {
    const input = createAutoMatchConditionInput({
      eventName: "週末テニス会",
      participantCount: 8,
      courtCount: 2,
      roundCount: 4,
    });
    const original = generateMatchupUseCase(input, 20260422);
    const url = buildSharedMatchUrl(original, "https://example.com/");
    const restored = restoreSharedMatchupFromSearch(new URL(url).search);

    expect(restored).not.toBeNull();
    expect(restored?.input).toEqual(input);
    expect(restored?.result.seed).toBe(original.seed);
    expect(restored?.result.rounds).toEqual(original.rounds);
    expect(restored?.result.score).toEqual(original.score);
    expect(restored?.result.stats).toEqual(original.stats);
  });

  it("returns null when the URL is not a shared matchup link", () => {
    expect(restoreSharedMatchupFromSearch("?event=test")).toBeNull();
  });

  it("rejects invalid shared matchup parameters", () => {
    expect(() =>
      restoreSharedMatchupFromSearch(
        "?shared=1&v=1.00&participants=3&courts=1&rounds=2&seed=10",
      ),
    ).toThrow();
  });
});
