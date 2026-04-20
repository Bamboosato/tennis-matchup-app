import { ensureMatrixValue } from "../utils/matrix";
import type { GenerationContext, Pair } from "../model/types";

type PairingCandidate = {
  pairA: Pair;
  pairB: Pair;
  score: number;
};

function teammatePenalty(ctx: GenerationContext, pair: Pair): number {
  return ensureMatrixValue(ctx.teammateMatrix, pair.player1Id, pair.player2Id);
}

function opponentPenalty(ctx: GenerationContext, pairA: Pair, pairB: Pair): number {
  return (
    ensureMatrixValue(ctx.opponentMatrix, pairA.player1Id, pairB.player1Id) +
    ensureMatrixValue(ctx.opponentMatrix, pairA.player1Id, pairB.player2Id) +
    ensureMatrixValue(ctx.opponentMatrix, pairA.player2Id, pairB.player1Id) +
    ensureMatrixValue(ctx.opponentMatrix, pairA.player2Id, pairB.player2Id)
  );
}

export function pickBestPairing(
  playerIds: string[],
  ctx: GenerationContext,
): [Pair, Pair] {
  const [a, b, c, d] = playerIds;
  const candidates: PairingCandidate[] = [
    {
      pairA: { player1Id: a, player2Id: b },
      pairB: { player1Id: c, player2Id: d },
      score: 0,
    },
    {
      pairA: { player1Id: a, player2Id: c },
      pairB: { player1Id: b, player2Id: d },
      score: 0,
    },
    {
      pairA: { player1Id: a, player2Id: d },
      pairB: { player1Id: b, player2Id: c },
      score: 0,
    },
  ];

  for (const candidate of candidates) {
    candidate.score =
      teammatePenalty(ctx, candidate.pairA) * 10 +
      teammatePenalty(ctx, candidate.pairB) * 10 +
      opponentPenalty(ctx, candidate.pairA, candidate.pairB) * 5;
  }

  candidates.sort((left, right) => left.score - right.score);

  return [candidates[0].pairA, candidates[0].pairB];
}
