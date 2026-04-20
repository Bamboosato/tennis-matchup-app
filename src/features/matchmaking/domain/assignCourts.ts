import type { CourtAssignment, GenerationContext } from "../model/types";
import { pickBestPairing } from "./pickBestPairing";
import { ensureMatrixValue } from "../utils/matrix";
import { seededValue } from "../utils/seededRandom";

function encounterLoad(playerId: string, activePlayerIds: string[], ctx: GenerationContext): number {
  return activePlayerIds.reduce((sum, current) => {
    if (current === playerId) {
      return sum;
    }

    return sum + ensureMatrixValue(ctx.encounterMatrix, playerId, current);
  }, 0);
}

function pickBasePlayer(remaining: string[], ctx: GenerationContext): string {
  return [...remaining].sort((left, right) => {
    const loadDiff = encounterLoad(right, remaining, ctx) - encounterLoad(left, remaining, ctx);

    if (loadDiff !== 0) {
      return loadDiff;
    }

    return seededValue(ctx.seed, "base", left) - seededValue(ctx.seed, "base", right);
  })[0];
}

function scoreCandidateForGroup(
  candidateId: string,
  currentGroup: string[],
  ctx: GenerationContext,
): number {
  return currentGroup.reduce((score, currentPlayerId) => {
    const encounterPenalty =
      ensureMatrixValue(ctx.encounterMatrix, candidateId, currentPlayerId) * 12;
    const teammatePenalty =
      ensureMatrixValue(ctx.teammateMatrix, candidateId, currentPlayerId) * 5;
    const opponentPenalty =
      ensureMatrixValue(ctx.opponentMatrix, candidateId, currentPlayerId) * 3;

    return score + encounterPenalty + teammatePenalty + opponentPenalty;
  }, 0);
}

function pickBestCourtGroup(
  basePlayerId: string,
  remaining: string[],
  ctx: GenerationContext,
): string[] {
  const group = [basePlayerId];
  const candidates = remaining.filter((playerId) => playerId !== basePlayerId);

  while (group.length < 4) {
    candidates.sort((left, right) => {
      const scoreDiff =
        scoreCandidateForGroup(left, group, ctx) -
        scoreCandidateForGroup(right, group, ctx);

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return (
        seededValue(ctx.seed, "court", left, group.join(",")) -
        seededValue(ctx.seed, "court", right, group.join(","))
      );
    });

    group.push(candidates.shift()!);
  }

  return group;
}

export function assignCourts(
  activePlayerIds: string[],
  ctx: GenerationContext,
): CourtAssignment[] {
  const usableCourtCount = Math.min(
    ctx.conditions.courtCount,
    Math.floor(activePlayerIds.length / ctx.conditions.playersPerCourt),
  );
  const remaining = [...activePlayerIds];
  const courts: CourtAssignment[] = [];

  while (remaining.length >= 4 && courts.length < usableCourtCount) {
    const basePlayerId = pickBasePlayer(remaining, ctx);
    const group = pickBestCourtGroup(basePlayerId, remaining, ctx);
    const [pairA, pairB] = pickBestPairing(group, ctx);

    courts.push({
      courtNumber: courts.length + 1,
      pairA,
      pairB,
      isUnused: false,
    });

    for (const playerId of group) {
      const index = remaining.indexOf(playerId);

      if (index >= 0) {
        remaining.splice(index, 1);
      }
    }
  }

  while (courts.length < ctx.conditions.courtCount) {
    courts.push({
      courtNumber: courts.length + 1,
      pairA: null,
      pairB: null,
      isUnused: true,
    });
  }

  return courts;
}
