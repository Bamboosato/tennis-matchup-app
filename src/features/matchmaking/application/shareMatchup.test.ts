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

  it("assigns female numbers before male numbers for gender-aware modes", () => {
    const input = createAutoMatchConditionInput({
      eventName: "男女別",
      matchupMode: "sameGenderPriority",
      participantCount: 8,
      femaleCount: 3,
      maleCount: 5,
      courtCount: 2,
      roundCount: 4,
    });

    expect(input.participants.map((participant) => `${participant.name}:${participant.gender}`)).toEqual([
      "01:female",
      "02:female",
      "03:female",
      "04:male",
      "05:male",
      "06:male",
      "07:male",
      "08:male",
    ]);
  });

  it("builds a gender-aware share URL that restores mode and gender counts", () => {
    const input = createAutoMatchConditionInput({
      eventName: "混合",
      matchupMode: "mixedDoublesPriority",
      participantCount: 8,
      femaleCount: 4,
      maleCount: 4,
      courtCount: 2,
      roundCount: 4,
    });
    const original = generateMatchupUseCase(input, 20260501);
    const url = buildSharedMatchUrl(original, "https://example.com/");
    const search = new URL(url).search;
    const restored = restoreSharedMatchupFromSearch(search);

    expect(new URL(url).searchParams.get("mode")).toBe("mixedDoublesPriority");
    expect(new URL(url).searchParams.get("female")).toBe("4");
    expect(new URL(url).searchParams.get("male")).toBe("4");
    expect(restored?.input).toEqual(input);
    expect(restored?.result.seed).toBe(original.seed);
    expect(restored?.result.rounds).toEqual(original.rounds);
  });

  it("restores legacy shared matchup links as standard mode", () => {
    const restored = restoreSharedMatchupFromSearch(
      "?shared=1&v=1.00&participants=8&courts=2&rounds=4&seed=10",
    );

    expect(restored?.input.matchupMode).toBe("standard");
    expect(restored?.result.conditions.matchupMode).toBe("standard");
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
