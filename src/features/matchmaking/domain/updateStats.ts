import { incrementMatrix } from "../utils/matrix";
import type { GenerationContext, RoundResult } from "../model/types";

function courtPlayerIds(round: RoundResult, courtIndex: number): string[] {
  const court = round.courts[courtIndex];

  if (!court || court.isUnused || !court.pairA || !court.pairB) {
    return [];
  }

  return [
    court.pairA.player1Id,
    court.pairA.player2Id,
    court.pairB.player1Id,
    court.pairB.player2Id,
  ];
}

export function updateStats(ctx: GenerationContext, round: RoundResult): void {
  for (const playerId of round.activePlayerIds) {
    ctx.appearanceCounts[playerId] = (ctx.appearanceCounts[playerId] ?? 0) + 1;
  }

  for (const playerId of round.restPlayerIds) {
    ctx.restCounts[playerId] = (ctx.restCounts[playerId] ?? 0) + 1;
  }

  round.courts.forEach((court, courtIndex) => {
    const players = courtPlayerIds(round, courtIndex);

    if (players.length !== 4 || !court.pairA || !court.pairB) {
      return;
    }

    for (let i = 0; i < players.length; i += 1) {
      for (let j = i + 1; j < players.length; j += 1) {
        incrementMatrix(ctx.encounterMatrix, players[i], players[j]);
      }
    }

    incrementMatrix(
      ctx.teammateMatrix,
      court.pairA.player1Id,
      court.pairA.player2Id,
    );
    incrementMatrix(
      ctx.teammateMatrix,
      court.pairB.player1Id,
      court.pairB.player2Id,
    );

    const opponents = [
      [court.pairA.player1Id, court.pairB.player1Id],
      [court.pairA.player1Id, court.pairB.player2Id],
      [court.pairA.player2Id, court.pairB.player1Id],
      [court.pairA.player2Id, court.pairB.player2Id],
    ] as const;

    opponents.forEach(([left, right]) => incrementMatrix(ctx.opponentMatrix, left, right));
  });

  ctx.restHistoryByRound.push(round.restPlayerIds);
  ctx.activeHistoryByRound.push(round.activePlayerIds);
}
