import { describe, expect, it } from "vitest";
import type { MatchConditionInput } from "../model/types";
import { generateMatchupUseCase } from "./generateMatchupUseCase";
import { generateContinuationMatchupUseCase } from "./generateContinuationMatchupUseCase";

function input(participantCount = 8): MatchConditionInput {
  return {
    eventName: "continuation",
    matchupMode: "standard",
    participantCount,
    courtCount: 2,
    roundCount: 4,
    participants: Array.from({ length: participantCount }, (_, index) => ({
      id: `player-${String(index + 1).padStart(2, "0")}`,
      name: String(index + 1).padStart(2, "0"),
    })),
  };
}

function genderInput(): MatchConditionInput {
  return {
    ...input(8),
    matchupMode: "mixedDoublesPriority",
    participants: Array.from({ length: 8 }, (_, index) => ({
      id: `player-${String(index + 1).padStart(2, "0")}`,
      name: String(index + 1).padStart(2, "0"),
      gender: index < 4 ? "female" : "male",
    })),
  };
}

describe("generateContinuationMatchupUseCase", () => {
  it("keeps completed rounds fixed while regenerating future rounds with changed participants", () => {
    const previousResult = generateMatchupUseCase(input(), 20260518);
    const fixedRounds = previousResult.rounds.slice(0, 2);
    const continuation = generateContinuationMatchupUseCase(
      {
        previousResult,
        completedRoundCount: 2,
        eligibleParticipantIds: previousResult.conditions.participants.map(
          (participant) => participant.id,
        ),
        withdrawnParticipantIds: ["player-03"],
        addCount: 1,
      },
      20260519,
    );

    expect(continuation.result.rounds.slice(0, 2)).toEqual(fixedRounds);
    expect(continuation.eligibleParticipantIds).not.toContain("player-03");
    expect(continuation.eligibleParticipantIds).toContain("player-09");

    for (const round of continuation.result.rounds.slice(2)) {
      expect(round.activePlayerIds).not.toContain("player-03");
      expect(round.restPlayerIds).not.toContain("player-03");
      expect([...round.activePlayerIds, ...round.restPlayerIds]).toContain("player-09");
    }
  });

  it("continues numbering from the full participant history and preserves gender for additions", () => {
    const previousResult = generateMatchupUseCase(genderInput(), 20260518);
    const firstContinuation = generateContinuationMatchupUseCase(
      {
        previousResult,
        completedRoundCount: 1,
        eligibleParticipantIds: previousResult.conditions.participants.map(
          (participant) => participant.id,
        ),
        withdrawnParticipantIds: ["player-02"],
        addFemaleCount: 1,
        addMaleCount: 1,
      },
      20260519,
    );
    const secondContinuation = generateContinuationMatchupUseCase(
      {
        previousResult: firstContinuation.result,
        completedRoundCount: 2,
        eligibleParticipantIds: firstContinuation.eligibleParticipantIds,
        withdrawnParticipantIds: ["player-05"],
        addFemaleCount: 0,
        addMaleCount: 1,
      },
      20260520,
    );

    expect(firstContinuation.result.conditions.participants.at(-2)).toMatchObject({
      id: "player-09",
      name: "09",
      gender: "female",
    });
    expect(firstContinuation.result.conditions.participants.at(-1)).toMatchObject({
      id: "player-10",
      name: "10",
      gender: "male",
    });
    expect(secondContinuation.result.conditions.participants.at(-1)).toMatchObject({
      id: "player-11",
      name: "11",
      gender: "male",
    });
    expect(secondContinuation.eligibleParticipantIds).not.toContain("player-02");
    expect(secondContinuation.eligibleParticipantIds).not.toContain("player-05");
    expect(secondContinuation.eligibleParticipantIds).toContain("player-11");
  });

  it("can append rounds after all existing rounds are completed", () => {
    const previousResult = generateMatchupUseCase(input(), 20260518);
    const continuation = generateContinuationMatchupUseCase(
      {
        previousResult,
        completedRoundCount: 4,
        eligibleParticipantIds: previousResult.conditions.participants.map(
          (participant) => participant.id,
        ),
        additionalRoundCount: 2,
        withdrawnParticipantIds: [],
      },
      20260519,
    );

    expect(continuation.result.conditions.roundCount).toBe(6);
    expect(continuation.result.rounds).toHaveLength(6);
    expect(continuation.result.rounds.slice(0, 4)).toEqual(previousResult.rounds);
    expect(continuation.eligibleParticipantIds).toEqual(
      previousResult.conditions.participants.map((participant) => participant.id),
    );
  });

  it("keeps requested court count but compacts future court assignments", () => {
    const previousResult = generateMatchupUseCase(input(), 20260518);
    const continuation = generateContinuationMatchupUseCase(
      {
        previousResult,
        completedRoundCount: 1,
        eligibleParticipantIds: previousResult.conditions.participants.map(
          (participant) => participant.id,
        ),
        withdrawnParticipantIds: ["player-08"],
      },
      20260519,
    );

    expect(continuation.result.conditions.courtCount).toBe(2);
    expect(continuation.result.rounds[0]).toEqual(previousResult.rounds[0]);

    for (const round of continuation.result.rounds.slice(1)) {
      expect(round.courts).toHaveLength(2);
      expect(round.courts[0]?.courtNumber).toBe(1);
      expect(round.courts[0]?.isUnused).toBe(false);
      expect(round.courts[1]?.courtNumber).toBe(2);
      expect(round.courts[1]?.isUnused).toBe(true);
    }
  });

  it("rejects continuation when future candidates would be fewer than four", () => {
    const previousResult = generateMatchupUseCase(input(4), 20260518);

    expect(() =>
      generateContinuationMatchupUseCase(
        {
          previousResult,
          completedRoundCount: 1,
          eligibleParticipantIds: previousResult.conditions.participants.map(
            (participant) => participant.id,
          ),
          withdrawnParticipantIds: ["player-01"],
        },
        20260519,
      ),
    ).toThrow("今後の生成対象者は4人以上必要です。");
  });
});
