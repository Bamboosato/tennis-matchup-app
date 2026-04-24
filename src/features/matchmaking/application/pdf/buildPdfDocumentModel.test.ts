import { describe, expect, it } from "vitest";
import type { MatchupResult, Participant, RoundResult } from "../../model/types";
import {
  PDF_ROUNDS_PER_PAGE,
  buildPdfDocumentModel,
  buildPdfFileName,
  truncateTextToWidth,
} from "./buildPdfDocumentModel";

function participants(count: number): Participant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${String(index + 1).padStart(2, "0")}`,
    name: String(index + 1).padStart(2, "0"),
    index,
  }));
}

function round(roundNumber: number): RoundResult {
  return {
    roundNumber,
    activePlayerIds: ["player-01", "player-02", "player-03", "player-04"],
    restPlayerIds: ["player-05", "player-06"],
    courts: [
      {
        courtNumber: 1,
        isUnused: false,
        pairA: {
          player1Id: "player-01",
          player2Id: "player-02",
        },
        pairB: {
          player1Id: "player-03",
          player2Id: "player-04",
        },
      },
      {
        courtNumber: 2,
        isUnused: true,
        pairA: null,
        pairB: null,
      },
    ],
  };
}

function result(roundCount: number): MatchupResult {
  const rows = Array.from({ length: roundCount }, (_, index) => round(index + 1));

  return {
    conditions: {
      eventName: "週末テニス会",
      participants: participants(6),
      courtCount: 2,
      roundCount,
      playersPerCourt: 4,
    },
    rounds: rows,
    stats: [],
    seed: 42,
    score: {
      fairnessPenalty: 0,
      consecutiveRestPenalty: 0,
      encounterPenalty: 0,
      sameTeammatePenalty: 0,
      sameOpponentPenalty: 0,
      totalScore: 0,
    },
    generatedAt: "2026-04-24T12:00:00.000Z",
  };
}

describe("buildPdfDocumentModel", () => {
  it("splits rounds into pages of ten rows", () => {
    const model = buildPdfDocumentModel(result(PDF_ROUNDS_PER_PAGE + 2));

    expect(model.pages).toHaveLength(2);
    expect(model.pages[0]?.rows).toHaveLength(PDF_ROUNDS_PER_PAGE);
    expect(model.pages[1]?.rows).toHaveLength(2);
  });

  it("formats round rows for table output", () => {
    const model = buildPdfDocumentModel(result(1));

    expect(model.pages[0]?.rows[0]).toEqual({
      roundLabel: "1",
      courtCells: ["01 / 02\n03 / 04", "未使用"],
      restCell: "05, 06",
    });
  });
});

describe("truncateTextToWidth", () => {
  it("keeps text unchanged when it fits", () => {
    expect(truncateTextToWidth("週末テニス会", 10, (value) => value.length)).toBe("週末テニス会");
  });

  it("adds an ellipsis when text exceeds max width", () => {
    expect(truncateTextToWidth("とても長い開催名です", 8, (value) => value.length)).toBe("とても長い...");
  });
});

describe("buildPdfFileName", () => {
  it("removes invalid file name characters", () => {
    expect(buildPdfFileName("春季/練習会:決勝?")).toBe("春季練習会決勝-matchup.pdf");
  });
});
