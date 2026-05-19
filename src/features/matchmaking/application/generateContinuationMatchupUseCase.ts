import { MATCH_CONDITION_LIMITS } from "@/features/matchmaking/model/limits";
import { generateMatchup } from "../domain/generateMatchup";
import type { MatchConditions, MatchupResult, Participant, ParticipantGender } from "../model/types";
import {
  buildCandidateSeeds,
  compareMatchupResults,
} from "./generateMatchupUseCase";

export type GenerateContinuationMatchupInput = {
  previousResult: MatchupResult;
  completedRoundCount: number;
  eligibleParticipantIds: string[];
  additionalRoundCount?: number;
  withdrawnParticipantIds: string[];
  addCount?: number;
  addFemaleCount?: number;
  addMaleCount?: number;
};

export type ContinuationMatchupResult = {
  result: MatchupResult;
  eligibleParticipantIds: string[];
};

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label}は0以上の整数で入力してください。`);
  }
}

function formatParticipantLabel(index: number): string {
  return (index + 1).toString().padStart(2, "0");
}

function createParticipant(
  index: number,
  gender: ParticipantGender | undefined,
): Participant {
  const label = formatParticipantLabel(index);
  const base = {
    id: `player-${label}`,
    name: label,
    index,
  };

  return gender
    ? {
        ...base,
        gender,
      }
    : base;
}

function nextAvailableParticipantIndex(
  startIndex: number,
  usedParticipantIds: Set<string>,
): number {
  let candidateIndex = startIndex;

  while (usedParticipantIds.has(`player-${formatParticipantLabel(candidateIndex)}`)) {
    candidateIndex += 1;
  }

  return candidateIndex;
}

function buildAddedParticipants(
  conditions: MatchConditions,
  addCount: number,
  addFemaleCount: number,
  addMaleCount: number,
): Participant[] {
  const usedParticipantIds = new Set(conditions.participants.map((participant) => participant.id));
  let nextIndex =
    Math.max(-1, ...conditions.participants.map((participant) => participant.index)) + 1;
  const genders: Array<ParticipantGender | undefined> =
    conditions.matchupMode === "standard"
      ? Array.from({ length: addCount }, () => undefined)
      : [
          ...Array.from({ length: addFemaleCount }, () => "female" as const),
          ...Array.from({ length: addMaleCount }, () => "male" as const),
        ];

  return genders.map((gender) => {
    nextIndex = nextAvailableParticipantIndex(nextIndex, usedParticipantIds);

    const participant = createParticipant(nextIndex, gender);
    usedParticipantIds.add(participant.id);
    nextIndex += 1;

    return participant;
  });
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function generateContinuationMatchupUseCase(
  input: GenerateContinuationMatchupInput,
  seed: number,
): ContinuationMatchupResult {
  const { previousResult } = input;
  const { conditions } = previousResult;
  const completedRoundCount = input.completedRoundCount;

  if (
    !Number.isInteger(completedRoundCount) ||
    completedRoundCount < 0 ||
    completedRoundCount > conditions.roundCount
  ) {
    throw new Error("実施済みラウンド数が不正です。");
  }

  const additionalRoundCount = input.additionalRoundCount ?? 0;
  const addCount = input.addCount ?? 0;
  const addFemaleCount = input.addFemaleCount ?? 0;
  const addMaleCount = input.addMaleCount ?? 0;

  assertNonNegativeInteger(additionalRoundCount, "追加ラウンド数");
  assertNonNegativeInteger(addCount, "追加人数");
  assertNonNegativeInteger(addFemaleCount, "追加女性数");
  assertNonNegativeInteger(addMaleCount, "追加男性数");

  const nextRoundCount = conditions.roundCount + additionalRoundCount;

  if (nextRoundCount > MATCH_CONDITION_LIMITS.roundCount.max) {
    throw new Error("ラウンド数は20回以下にしてください。");
  }

  if (completedRoundCount >= nextRoundCount) {
    throw new Error("全ラウンド実施済みです。追加ラウンドを指定して再作成してください。");
  }

  const effectiveAddCount =
    conditions.matchupMode === "standard" ? addCount : addFemaleCount + addMaleCount;
  const withdrawnParticipantIds = uniqueIds(input.withdrawnParticipantIds);

  if (
    additionalRoundCount === 0 &&
    withdrawnParticipantIds.length === 0 &&
    effectiveAddCount === 0
  ) {
    throw new Error("追加ラウンド、退出者、追加参加者のいずれかを指定してください。");
  }

  const participantIdSet = new Set(conditions.participants.map((participant) => participant.id));
  const currentEligibleIds = uniqueIds(input.eligibleParticipantIds).filter((participantId) =>
    participantIdSet.has(participantId),
  );
  const currentEligibleIdSet = new Set(currentEligibleIds);

  if (withdrawnParticipantIds.some((participantId) => !currentEligibleIdSet.has(participantId))) {
    throw new Error("退出者は今後の生成対象者から選択してください。");
  }

  const addedParticipants = buildAddedParticipants(
    conditions,
    addCount,
    addFemaleCount,
    addMaleCount,
  );
  const nextParticipants = [...conditions.participants, ...addedParticipants];

  if (nextParticipants.length > MATCH_CONDITION_LIMITS.participantCount.max) {
    throw new Error("参加者は総計30人以下にしてください。");
  }

  const withdrawnParticipantIdSet = new Set(withdrawnParticipantIds);
  const nextEligibleParticipantIds = [
    ...currentEligibleIds.filter((participantId) => !withdrawnParticipantIdSet.has(participantId)),
    ...addedParticipants.map((participant) => participant.id),
  ];

  if (nextEligibleParticipantIds.length < MATCH_CONDITION_LIMITS.participantCount.min) {
    throw new Error("今後の生成対象者は4人以上必要です。");
  }

  const fixedRounds = previousResult.rounds.slice(0, completedRoundCount);
  const nextConditions: MatchConditions = {
    ...conditions,
    roundCount: nextRoundCount,
    participants: nextParticipants,
  };
  const results = buildCandidateSeeds(seed).map((candidateSeed) =>
    generateMatchup(nextConditions, candidateSeed, {
      initialRounds: fixedRounds,
      eligibleParticipantIds: nextEligibleParticipantIds,
      courtAssignmentMode: "compact",
    }),
  );

  results.sort(compareMatchupResults);

  return {
    result: results[0],
    eligibleParticipantIds: nextEligibleParticipantIds,
  };
}
