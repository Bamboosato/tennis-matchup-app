import { SCORE_WEIGHTS } from "@/lib/constants/scoring";
import { ensureMatrixValue } from "../utils/matrix";
import type { GenerationContext, PlayerStats, ResultScore } from "../model/types";

function duplicatedPairPenalty(
  matrix: GenerationContext["encounterMatrix"],
  playerIds: string[],
): number {
  let penalty = 0;

  for (let i = 0; i < playerIds.length; i += 1) {
    for (let j = i + 1; j < playerIds.length; j += 1) {
      penalty += Math.max(0, ensureMatrixValue(matrix, playerIds[i], playerIds[j]) - 1);
    }
  }

  return penalty;
}

export function buildPlayerStats(ctx: GenerationContext): PlayerStats[] {
  return ctx.conditions.participants.map((participant) => {
    const rests = ctx.restCounts[participant.id] ?? 0;
    const appearances = ctx.appearanceCounts[participant.id] ?? 0;
    const uniqueEncounterCount = Object.values(ctx.encounterMatrix[participant.id] ?? {}).filter(
      (count) => count > 0,
    ).length;

    let consecutiveRestCount = 0;
    let previousRest = false;

    for (const restPlayerIds of ctx.restHistoryByRound) {
      const currentRest = restPlayerIds.includes(participant.id);

      if (previousRest && currentRest) {
        consecutiveRestCount += 1;
      }

      previousRest = currentRest;
    }

    return {
      playerId: participant.id,
      appearances,
      rests,
      uniqueEncounterCount,
      consecutiveRestCount,
    };
  });
}

export function calculateScore(
  ctx: GenerationContext,
  stats: PlayerStats[],
): ResultScore {
  const restCounts = stats.map((stat) => stat.rests);
  const fairnessPenalty = Math.max(...restCounts) - Math.min(...restCounts);
  const consecutiveRestPenalty = stats.reduce(
    (sum, stat) => sum + stat.consecutiveRestCount,
    0,
  );
  const playerIds = ctx.conditions.participants.map((participant) => participant.id);
  const encounterPenalty = duplicatedPairPenalty(ctx.encounterMatrix, playerIds);
  const sameTeammatePenalty = duplicatedPairPenalty(ctx.teammateMatrix, playerIds);
  const sameOpponentPenalty = duplicatedPairPenalty(ctx.opponentMatrix, playerIds);
  const totalScore =
    fairnessPenalty * SCORE_WEIGHTS.fairness +
    consecutiveRestPenalty * SCORE_WEIGHTS.consecutiveRest +
    encounterPenalty * SCORE_WEIGHTS.encounter +
    sameTeammatePenalty * SCORE_WEIGHTS.teammate +
    sameOpponentPenalty * SCORE_WEIGHTS.opponent;

  return {
    fairnessPenalty,
    consecutiveRestPenalty,
    encounterPenalty,
    sameTeammatePenalty,
    sameOpponentPenalty,
    totalScore,
  };
}
