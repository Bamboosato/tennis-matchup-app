import type { GenerationContext, MatchConditions, MatchupResult, RoundResult } from "../model/types";
import { selectRestPlayers } from "./selectRestPlayers";
import { assignCourts } from "./assignCourts";
import { buildPlayerStats, calculateScore } from "./calculateScore";
import { updateStats } from "./updateStats";

function createContext(conditions: MatchConditions, seed: number): GenerationContext {
  const participantIds = conditions.participants.map((participant) => participant.id);

  return {
    conditions,
    seed,
    restCounts: Object.fromEntries(participantIds.map((participantId) => [participantId, 0])),
    appearanceCounts: Object.fromEntries(
      participantIds.map((participantId) => [participantId, 0]),
    ),
    courtAppearanceCounts: Object.fromEntries(
      participantIds.map((participantId) => [participantId, {}]),
    ),
    courtUsageCounts: Object.fromEntries(
      Array.from({ length: conditions.courtCount }, (_, index) => [index + 1, 0]),
    ),
    encounterMatrix: {},
    teammateMatrix: {},
    opponentMatrix: {},
    restHistoryByRound: [],
    activeHistoryByRound: [],
  };
}

export function generateMatchup(
  conditions: MatchConditions,
  seed: number,
): MatchupResult {
  const ctx = createContext(conditions, seed);
  const rounds: RoundResult[] = [];

  for (let roundIndex = 0; roundIndex < conditions.roundCount; roundIndex += 1) {
    const restPlayerIds = selectRestPlayers(ctx, roundIndex);
    const restPlayerIdSet = new Set(restPlayerIds);
    const activePlayerIds = conditions.participants
      .map((participant) => participant.id)
      .filter((participantId) => !restPlayerIdSet.has(participantId));
    const courts = assignCourts(activePlayerIds, ctx);
    const round: RoundResult = {
      roundNumber: roundIndex + 1,
      courts,
      restPlayerIds,
      activePlayerIds,
    };

    updateStats(ctx, round);
    rounds.push(round);
  }

  const stats = buildPlayerStats(ctx);
  const score = calculateScore(ctx, stats, rounds);

  return {
    conditions,
    rounds,
    stats,
    seed,
    score,
    generatedAt: new Date().toISOString(),
  };
}
