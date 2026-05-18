"use client";

import { useState } from "react";
import { CountStepperField } from "@/components/conditions/CountStepperField";
import { formatParticipantName } from "@/features/matchmaking/application/formatParticipantName";
import { MATCH_CONDITION_LIMITS } from "@/features/matchmaking/model/limits";
import type { MatchupResult } from "@/features/matchmaking/model/types";

export type ContinuationDraft = {
  additionalRoundCount: number;
  withdrawnParticipantIds: string[];
  addCount: number;
  addFemaleCount: number;
  addMaleCount: number;
};

type ContinuationPanelProps = {
  result: MatchupResult;
  eligibleParticipantIds: string[];
  completedRoundCount: number;
  isGenerating: boolean;
  onSubmit: (draft: ContinuationDraft) => Promise<boolean>;
};

function parseDraftCount(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.trunc(parsed));
}

function clampCount(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatRoundRange(startRound: number, endRound: number): string {
  if (startRound === endRound) {
    return `Round ${startRound}`;
  }

  return `Round ${startRound}〜${endRound}`;
}

function selectedParticipantLabel(
  result: MatchupResult,
  withdrawnParticipantIds: string[],
): string {
  if (withdrawnParticipantIds.length === 0) {
    return "なし";
  }

  return withdrawnParticipantIds
    .map((participantId) => {
      const participant = result.conditions.participants.find((entry) => entry.id === participantId);

      return participant ? formatParticipantName(participant) : participantId;
    })
    .join("、");
}

export function ContinuationPanel({
  result,
  eligibleParticipantIds,
  completedRoundCount,
  isGenerating,
  onSubmit,
}: ContinuationPanelProps) {
  const [additionalRoundCount, setAdditionalRoundCount] = useState(0);
  const [additionalRoundCountInput, setAdditionalRoundCountInput] = useState("0");
  const [withdrawnParticipantIds, setWithdrawnParticipantIds] = useState<string[]>([]);
  const [addCount, setAddCount] = useState(0);
  const [addCountInput, setAddCountInput] = useState("0");
  const [addFemaleCount, setAddFemaleCount] = useState(0);
  const [addFemaleCountInput, setAddFemaleCountInput] = useState("0");
  const [addMaleCount, setAddMaleCount] = useState(0);
  const [addMaleCountInput, setAddMaleCountInput] = useState("0");

  const roundCount = result.conditions.roundCount;
  const currentRoundNumber = completedRoundCount + 1;
  const maxAdditionalRoundCount = Math.max(0, MATCH_CONDITION_LIMITS.roundCount.max - roundCount);
  const targetRoundCount = roundCount + additionalRoundCount;
  const hasTargetRound = currentRoundNumber <= targetRoundCount;
  const availableAddSlots = Math.max(
    0,
    MATCH_CONDITION_LIMITS.participantCount.max - result.conditions.participants.length,
  );
  const eligibleParticipantIdSet = new Set(eligibleParticipantIds);
  const withdrawalCandidates = result.conditions.participants
    .toSorted((left, right) => left.index - right.index);
  const effectiveAddCount =
    result.conditions.matchupMode === "standard" ? addCount : addFemaleCount + addMaleCount;
  const remainingAddSlots = Math.max(0, availableAddSlots - effectiveAddCount);
  const nextEligibleCount =
    eligibleParticipantIds.length - withdrawnParticipantIds.length + effectiveAddCount;
  const hasDraftChange =
    additionalRoundCount > 0 || withdrawnParticipantIds.length > 0 || effectiveAddCount > 0;
  const additionalRoundExceedsLimit =
    targetRoundCount > MATCH_CONDITION_LIMITS.roundCount.max;
  const addTotalExceedsLimit = effectiveAddCount > availableAddSlots;

  const disabledReason = additionalRoundExceedsLimit
    ? "ラウンド数は20回以下にしてください。"
    : !hasTargetRound
      ? "全ラウンド実施済みです。追加ラウンドを指定して再作成してください。"
      : !hasDraftChange
        ? "追加ラウンド、退出者、追加参加者のいずれかを指定してください。"
        : addTotalExceedsLimit
          ? "参加者履歴は30人以下にしてください。"
          : nextEligibleCount < MATCH_CONDITION_LIMITS.participantCount.min
            ? "今後の生成対象者は4人以上必要です。"
            : null;
  const submitDisabled = isGenerating || disabledReason !== null;

  function resetDraft() {
    setAdditionalRoundCount(0);
    setAdditionalRoundCountInput("0");
    setWithdrawnParticipantIds([]);
    setAddCount(0);
    setAddCountInput("0");
    setAddFemaleCount(0);
    setAddFemaleCountInput("0");
    setAddMaleCount(0);
    setAddMaleCountInput("0");
  }

  function toggleWithdrawnParticipant(participantId: string) {
    setWithdrawnParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((entry) => entry !== participantId)
        : [...current, participantId],
    );
  }

  function changeAdditionalRoundCount(value: string) {
    setAdditionalRoundCountInput(value);

    const parsed = parseDraftCount(value);

    if (parsed !== null) {
      setAdditionalRoundCount(parsed);
    }
  }

  function commitAdditionalRoundCount() {
    const safeCount = clampCount(additionalRoundCount, 0, maxAdditionalRoundCount);

    setAdditionalRoundCount(safeCount);
    setAdditionalRoundCountInput(String(safeCount));
  }

  function stepAdditionalRoundCount(delta: number) {
    const nextCount = clampCount(additionalRoundCount + delta, 0, maxAdditionalRoundCount);

    setAdditionalRoundCount(nextCount);
    setAdditionalRoundCountInput(String(nextCount));
  }

  function changeAddCount(value: string) {
    setAddCountInput(value);

    const parsed = parseDraftCount(value);

    if (parsed !== null) {
      setAddCount(parsed);
    }
  }

  function commitAddCount() {
    const safeCount = clampCount(addCount, 0, availableAddSlots);

    setAddCount(safeCount);
    setAddCountInput(String(safeCount));
  }

  function stepAddCount(delta: number) {
    const nextCount = clampCount(addCount + delta, 0, availableAddSlots);

    setAddCount(nextCount);
    setAddCountInput(String(nextCount));
  }

  function changeAddFemaleCount(value: string) {
    setAddFemaleCountInput(value);

    const parsed = parseDraftCount(value);

    if (parsed !== null) {
      setAddFemaleCount(parsed);
    }
  }

  function commitAddFemaleCount() {
    const safeCount = clampCount(addFemaleCount, 0, Math.max(0, availableAddSlots - addMaleCount));

    setAddFemaleCount(safeCount);
    setAddFemaleCountInput(String(safeCount));
  }

  function stepAddFemaleCount(delta: number) {
    const nextCount = clampCount(
      addFemaleCount + delta,
      0,
      Math.max(0, availableAddSlots - addMaleCount),
    );

    setAddFemaleCount(nextCount);
    setAddFemaleCountInput(String(nextCount));
  }

  function changeAddMaleCount(value: string) {
    setAddMaleCountInput(value);

    const parsed = parseDraftCount(value);

    if (parsed !== null) {
      setAddMaleCount(parsed);
    }
  }

  function commitAddMaleCount() {
    const safeCount = clampCount(addMaleCount, 0, Math.max(0, availableAddSlots - addFemaleCount));

    setAddMaleCount(safeCount);
    setAddMaleCountInput(String(safeCount));
  }

  function stepAddMaleCount(delta: number) {
    const nextCount = clampCount(
      addMaleCount + delta,
      0,
      Math.max(0, availableAddSlots - addFemaleCount),
    );

    setAddMaleCount(nextCount);
    setAddMaleCountInput(String(nextCount));
  }

  async function handleSubmit() {
    if (submitDisabled) {
      return;
    }

    const succeeded = await onSubmit({
      additionalRoundCount,
      withdrawnParticipantIds,
      addCount,
      addFemaleCount,
      addMaleCount,
    });

    if (succeeded) {
      resetDraft();
    }
  }

  return (
    <section
      data-testid="continuation-panel"
      className="rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-base font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
            Continuation
          </p>
          <div className="mt-1">
            <h3 className="text-2xl font-semibold">ラウンド追加・参加者途中変更</h3>
            <p
              data-testid="continuation-share-attention"
              className="mt-2 grid gap-1 text-base font-semibold leading-7 text-[#8f3822]"
            >
              <span>※初回作成時の対戦モード、人数を基準に再作成されます。</span>
              <span>※人数の増減は既に未実施のラウンドにのみ反映されます。</span>
              <span>※再作成後は対戦表の共有ができなくなります。</span>
            </p>
          </div>
        </div>
        <div className="grid gap-1 text-base text-[var(--color-muted)] md:ml-auto md:w-fit md:shrink-0 md:justify-items-start md:text-left">
          <span data-testid="continuation-completed-range">
            実施済み: {completedRoundCount > 0 ? formatRoundRange(1, completedRoundCount) : "なし"}
          </span>
          <span data-testid="continuation-current-round">
            現ラウンド: {hasTargetRound ? `Round ${currentRoundNumber}` : "なし"}
          </span>
          <span data-testid="continuation-target-rounds">
            再作成対象:{" "}
            {hasTargetRound ? formatRoundRange(currentRoundNumber, targetRoundCount) : "なし"}
          </span>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <CountStepperField
            label="追加ラウンド数"
            value={additionalRoundCountInput}
            numericValue={additionalRoundCount}
            min={0}
            max={maxAdditionalRoundCount}
            inputTestId="continuation-additional-round-count-input"
            decrementTestId="continuation-additional-round-count-decrement"
            incrementTestId="continuation-additional-round-count-increment"
            decrementLabel="追加ラウンド数を1回減らす"
            incrementLabel="追加ラウンド数を1回増やす"
            disabled={isGenerating || maxAdditionalRoundCount <= 0}
            onChange={changeAdditionalRoundCount}
            onCommit={commitAdditionalRoundCount}
            onStep={stepAdditionalRoundCount}
          />
        </div>

        <div>
          <p className="text-base font-semibold text-[var(--color-ink)]">退出する番号</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {withdrawalCandidates.map((participant) => {
              const selected = withdrawnParticipantIds.includes(participant.id);
              const alreadyWithdrawn = !eligibleParticipantIdSet.has(participant.id);

              return (
                <button
                  key={participant.id}
                  data-testid={`withdraw-participant-${participant.id}`}
                  type="button"
                  aria-pressed={selected}
                  disabled={isGenerating || alreadyWithdrawn}
                  onClick={() => toggleWithdrawnParticipant(participant.id)}
                  className={
                    alreadyWithdrawn
                      ? "cursor-not-allowed rounded-full border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-base font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                      : selected
                      ? "rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-2 text-base font-semibold text-white"
                      : "rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-base font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-accent)]"
                  }
                >
                  {formatParticipantName(participant)}
                </button>
              );
            })}
          </div>
          <p
            data-testid="continuation-withdrawn-summary"
            className="mt-2 text-base text-[var(--color-muted)]"
          >
            選択中: {selectedParticipantLabel(result, withdrawnParticipantIds)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {result.conditions.matchupMode === "standard" ? (
            <CountStepperField
              label="追加人数"
              value={addCountInput}
              numericValue={addCount}
              min={0}
              max={availableAddSlots}
              inputTestId="continuation-add-count-input"
              decrementTestId="continuation-add-count-decrement"
              incrementTestId="continuation-add-count-increment"
              decrementLabel="追加人数を1人減らす"
              incrementLabel="追加人数を1人増やす"
              disabled={isGenerating || availableAddSlots <= 0}
              onChange={changeAddCount}
              onCommit={commitAddCount}
              onStep={stepAddCount}
            />
          ) : (
            <>
              <CountStepperField
                label="追加女性"
                value={addFemaleCountInput}
                numericValue={addFemaleCount}
                min={0}
                max={Math.max(0, availableAddSlots - addMaleCount)}
                inputTestId="continuation-add-female-count-input"
                decrementTestId="continuation-add-female-count-decrement"
                incrementTestId="continuation-add-female-count-increment"
                decrementLabel="追加女性を1人減らす"
                incrementLabel="追加女性を1人増やす"
                disabled={isGenerating || availableAddSlots <= 0}
                onChange={changeAddFemaleCount}
                onCommit={commitAddFemaleCount}
                onStep={stepAddFemaleCount}
              />
              <CountStepperField
                label="追加男性"
                value={addMaleCountInput}
                numericValue={addMaleCount}
                min={0}
                max={Math.max(0, availableAddSlots - addFemaleCount)}
                inputTestId="continuation-add-male-count-input"
                decrementTestId="continuation-add-male-count-decrement"
                incrementTestId="continuation-add-male-count-increment"
                decrementLabel="追加男性を1人減らす"
                incrementLabel="追加男性を1人増やす"
                disabled={isGenerating || availableAddSlots <= 0}
                onChange={changeAddMaleCount}
                onCommit={commitAddMaleCount}
                onStep={stepAddMaleCount}
              />
            </>
          )}
        </div>

        <div className="rounded-[1.3rem] border border-[rgba(240,106,60,0.32)] bg-[#fff7ef] px-4 py-3 text-base text-[var(--color-ink)]">
          <p data-testid="continuation-next-eligible-count" className="font-semibold">
            以降の対象人数: {eligibleParticipantIds.length}人 → {nextEligibleCount}人
          </p>
          <p className="mt-1 text-[var(--color-muted)]">
            追加できる参加者: 残り {remainingAddSlots}人
          </p>
          {disabledReason ? (
            <p data-testid="continuation-disabled-reason" className="mt-2 text-[#8f3822]">
              {disabledReason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-center sm:justify-end">
        <button
          data-testid="continuation-submit-button"
          type="button"
          disabled={submitDisabled}
          onClick={() => void handleSubmit()}
          className="rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-base font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating
            ? "再作成中..."
            : hasTargetRound
              ? `Round ${currentRoundNumber}以降を再作成`
              : "途中再作成できません"}
        </button>
      </div>
    </section>
  );
}
