import type { CourtAssignment, GenerationContext } from "../model/types";
import { pickBestPairing } from "./pickBestPairing";
import { ensureMatrixValue } from "../utils/matrix";
import { seededValue } from "../utils/seededRandom";

type ActiveCourtAssignment = Omit<CourtAssignment, "courtNumber" | "isUnused">;

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

function courtPlayerIds(court: ActiveCourtAssignment): string[] {
  if (!court.pairA || !court.pairB) {
    return [];
  }

  return [
    court.pairA.player1Id,
    court.pairA.player2Id,
    court.pairB.player1Id,
    court.pairB.player2Id,
  ];
}

function courtExposurePenalty(
  playerIds: string[],
  courtNumber: number,
  ctx: GenerationContext,
): number {
  return playerIds.reduce((sum, playerId) => {
    return sum + (ctx.courtAppearanceCounts[playerId]?.[courtNumber] ?? 0);
  }, 0);
}

function buildCourtNumbers(courtCount: number): number[] {
  return Array.from({ length: courtCount }, (_, index) => index + 1);
}

function rebalanceCourtNumbers(
  activeCourts: ActiveCourtAssignment[],
  ctx: GenerationContext,
): CourtAssignment[] {
  const allCourtNumbers = buildCourtNumbers(ctx.conditions.courtCount);

  if (activeCourts.length === 0) {
    return allCourtNumbers.map((courtNumber) => ({
      courtNumber,
      pairA: null,
      pairB: null,
      isUnused: true,
    }));
  }

  const roundIndex = ctx.activeHistoryByRound.length + 1;
  const serializedCourts = activeCourts.map((court) => courtPlayerIds(court).join(","));
  let bestAssignment:
    | {
        courtNumbers: number[];
        exposurePenalty: number;
        usagePenalty: number;
      }
    | null = null;

  function visit(
    courtIndex: number,
    remainingCourtNumbers: number[],
    assignedCourtNumbers: number[],
    exposurePenalty: number,
    usagePenalty: number,
  ): void {
    if (courtIndex >= activeCourts.length) {
      if (
        !bestAssignment ||
        exposurePenalty < bestAssignment.exposurePenalty ||
        (exposurePenalty === bestAssignment.exposurePenalty &&
          usagePenalty < bestAssignment.usagePenalty)
      ) {
        bestAssignment = {
          courtNumbers: [...assignedCourtNumbers],
          exposurePenalty,
          usagePenalty,
        };
      }

      return;
    }

    const playerIds = courtPlayerIds(activeCourts[courtIndex]);
    const orderedCourtNumbers = [...remainingCourtNumbers].sort((left, right) => {
      return (
        seededValue(ctx.seed, "court-balance", roundIndex, courtIndex, left, serializedCourts[courtIndex]) -
        seededValue(ctx.seed, "court-balance", roundIndex, courtIndex, right, serializedCourts[courtIndex])
      );
    });

    for (const courtNumber of orderedCourtNumbers) {
      const nextRemainingCourtNumbers = remainingCourtNumbers.filter(
        (candidate) => candidate !== courtNumber,
      );

      visit(
        courtIndex + 1,
        nextRemainingCourtNumbers,
        [...assignedCourtNumbers, courtNumber],
        exposurePenalty + courtExposurePenalty(playerIds, courtNumber, ctx),
        usagePenalty + (ctx.courtUsageCounts[courtNumber] ?? 0),
      );
    }
  }

  visit(0, allCourtNumbers, [], 0, 0);

  const assignedCourtNumbers =
    bestAssignment?.courtNumbers ?? allCourtNumbers.slice(0, activeCourts.length);
  const activeAssignments = activeCourts.map((court, index) => ({
    courtNumber: assignedCourtNumbers[index],
    pairA: court.pairA,
    pairB: court.pairB,
    isUnused: false,
  }));
  const usedCourtNumberSet = new Set(assignedCourtNumbers);
  const unusedAssignments = allCourtNumbers
    .filter((courtNumber) => !usedCourtNumberSet.has(courtNumber))
    .map((courtNumber) => ({
      courtNumber,
      pairA: null,
      pairB: null,
      isUnused: true,
    }));

  return [...activeAssignments, ...unusedAssignments].sort(
    (left, right) => left.courtNumber - right.courtNumber,
  );
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
  const activeCourts: ActiveCourtAssignment[] = [];

  while (remaining.length >= 4 && activeCourts.length < usableCourtCount) {
    const basePlayerId = pickBasePlayer(remaining, ctx);
    const group = pickBestCourtGroup(basePlayerId, remaining, ctx);
    const [pairA, pairB] = pickBestPairing(group, ctx);

    activeCourts.push({
      pairA,
      pairB,
    });

    for (const playerId of group) {
      const index = remaining.indexOf(playerId);

      if (index >= 0) {
        remaining.splice(index, 1);
      }
    }
  }

  return rebalanceCourtNumbers(activeCourts, ctx);
}
