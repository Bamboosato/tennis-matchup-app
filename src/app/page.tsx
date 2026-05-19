"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { CourtCountAdjustmentDialog } from "@/components/conditions/CourtCountAdjustmentDialog";
import { ConditionForm } from "@/components/conditions/ConditionForm";
import { ResponsiveShell } from "@/components/layout/ResponsiveShell";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { AppShareDialog } from "@/components/share/AppShareDialog";
import { ResultShareDialog } from "@/components/share/ResultShareDialog";
import {
  ContinuationPanel,
  type ContinuationDraft,
} from "@/components/results/ContinuationPanel";
import { PlayerStatsTable } from "@/components/results/PlayerStatsTable";
import { RoundCard } from "@/components/results/RoundCard";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import {
  createAutoMatchConditionInput,
  restoreSharedMatchupFromSearch,
} from "@/features/matchmaking/application/shareMatchup";
import { generateContinuationMatchupUseCase } from "@/features/matchmaking/application/generateContinuationMatchupUseCase";
import { MATCH_CONDITION_LIMITS } from "@/features/matchmaking/model/limits";
import type { MatchConditionInput, MatchupMode } from "@/features/matchmaking/model/types";
import { useMatchupGeneration } from "@/hooks/useMatchupGeneration";
import { useMatchupPdfExport } from "@/hooks/useMatchupPdfExport";
import { usePrintPreview } from "@/hooks/usePrintPreview";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { withAssetVersion } from "@/lib/constants/assets";
import { useMatchupStore } from "@/stores/matchupStore";

const PLAYERS_PER_COURT = 4;

type PendingCourtCountAdjustment = {
  input: MatchConditionInput;
  seed: number;
  isRegeneration: boolean;
  enteredCourtCount: number;
  adjustedCourtCount: number;
};

function parseDraftCount(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

function clampCount(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultGenderCounts(participantCount: number) {
  const femaleCount = Math.floor(participantCount / 2);

  return {
    femaleCount,
    maleCount: participantCount - femaleCount,
  };
}

function countInputGenders(input: MatchConditionInput | undefined, participantCount: number) {
  if (!input || !input.matchupMode || input.matchupMode === "standard") {
    return defaultGenderCounts(participantCount);
  }

  return input.participants.reduce(
    (counts, participant) => {
      if (participant.gender === "female") {
        counts.femaleCount += 1;
      } else if (participant.gender === "male") {
        counts.maleCount += 1;
      }

      return counts;
    },
    { femaleCount: 0, maleCount: 0 },
  );
}

export default function HomePage() {
  const [initialSharedLoad] = useState(() => {
    if (typeof window === "undefined") {
      return { restored: null, message: null as string | null, errorMessage: null as string | null };
    }

    try {
      const restored = restoreSharedMatchupFromSearch(window.location.search);

      if (!restored) {
        return { restored: null, message: null, errorMessage: null };
      }

      return {
        restored,
        message: "共有された対戦表を表示中です。",
        errorMessage: null,
      };
    } catch {
      const params = new URLSearchParams(window.location.search);

      if (params.get("shared") === "1") {
        return {
          restored: null,
          message: "共有URLの内容が不正なため復元できませんでした。",
          errorMessage: "共有URLを読み込めませんでした。",
        };
      }

      return { restored: null, message: null, errorMessage: null };
    }
  });
  const [eventName, setEventName] = useState(initialSharedLoad.restored?.input.eventName ?? "週末テニス会");
  const [participantCount, setParticipantCount] = useState(
    initialSharedLoad.restored?.input.participantCount ?? 8,
  );
  const initialGenderCounts = countInputGenders(
    initialSharedLoad.restored?.input,
    initialSharedLoad.restored?.input.participantCount ?? 8,
  );
  const [matchupMode, setMatchupMode] = useState<MatchupMode>(
    initialSharedLoad.restored?.input.matchupMode ?? "standard",
  );
  const [participantCountInput, setParticipantCountInput] = useState(String(participantCount));
  const [femaleCount, setFemaleCount] = useState(initialGenderCounts.femaleCount);
  const [femaleCountInput, setFemaleCountInput] = useState(String(femaleCount));
  const [maleCount, setMaleCount] = useState(initialGenderCounts.maleCount);
  const [maleCountInput, setMaleCountInput] = useState(String(maleCount));
  const [courtCount, setCourtCount] = useState(initialSharedLoad.restored?.input.courtCount ?? 2);
  const [courtCountInput, setCourtCountInput] = useState(String(courtCount));
  const [roundCount, setRoundCount] = useState(initialSharedLoad.restored?.input.roundCount ?? 4);
  const [roundCountInput, setRoundCountInput] = useState(String(roundCount));
  const [completedRoundsState, setCompletedRoundsState] = useState<{
    generatedAt: string | null;
    completedRoundCount: number;
    lockedCompletedRoundCount: number;
  }>({
    generatedAt: null,
    completedRoundCount: 0,
    lockedCompletedRoundCount: 0,
  });
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [appShareDialogOpen, setAppShareDialogOpen] = useState(false);
  const [resultShareDialogOpen, setResultShareDialogOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const completionMessageTimerRef = useRef<number | null>(null);
  const [pendingCourtCountAdjustment, setPendingCourtCountAdjustment] =
    useState<PendingCourtCountAdjustment | null>(null);
  const [sharedResultMessage, setSharedResultMessage] = useState<string | null>(
    initialSharedLoad.message,
  );
  const result = useMatchupStore((state) => state.result);
  const resultSource = useMatchupStore((state) => state.resultSource);
  const eligibleParticipantIds = useMatchupStore((state) => state.eligibleParticipantIds);
  const errorMessage = useMatchupStore((state) => state.errorMessage);
  const isGenerating = useMatchupStore((state) => state.isGenerating);
  const rerollCount = useMatchupStore((state) => state.rerollCount);
  const currentSeed = useMatchupStore((state) => state.currentSeed);
  const setInstalled = useMatchupStore((state) => state.setInstalled);
  const setConditions = useMatchupStore((state) => state.setConditions);
  const setResult = useMatchupStore((state) => state.setResult);
  const setErrorMessage = useMatchupStore((state) => state.setErrorMessage);
  const setGenerating = useMatchupStore((state) => state.setGenerating);
  const { generate, regenerate } = useMatchupGeneration();
  const { openPrintPreview } = usePrintPreview();
  const { exportPdf, isExportingPdf, pdfErrorMessage, clearPdfError } = useMatchupPdfExport();
  const { canPromptInstall, isInstalled, promptInstall } = usePwaInstallPrompt();
  const completedRoundCount =
    result && completedRoundsState.generatedAt === result.generatedAt
      ? completedRoundsState.completedRoundCount
      : 0;
  const lockedCompletedRoundCount =
    result && completedRoundsState.generatedAt === result.generatedAt
      ? completedRoundsState.lockedCompletedRoundCount
      : 0;
  const shareDisabled = resultSource === "continuation";

  useEffect(() => {
    setInstalled(isInstalled);
  }, [isInstalled, setInstalled]);

  useEffect(() => {
    return () => {
      if (completionMessageTimerRef.current !== null) {
        window.clearTimeout(completionMessageTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialSharedLoad.restored) {
      setConditions(initialSharedLoad.restored.input);
      setResult(initialSharedLoad.restored.result, initialSharedLoad.restored.result.seed);
      setErrorMessage(null);
      return;
    }

    if (initialSharedLoad.errorMessage) {
      setErrorMessage(initialSharedLoad.errorMessage);
    }
  }, [initialSharedLoad, setConditions, setErrorMessage, setResult]);

  function applyParticipantCount(nextCount: number, inputValue = String(nextCount)) {
    const safeCount = clampCount(
      nextCount,
      MATCH_CONDITION_LIMITS.participantCount.min,
      MATCH_CONDITION_LIMITS.participantCount.max,
    );
    const wasBalanced = femaleCount + maleCount === participantCount;

    setParticipantCountInput(inputValue);
    setParticipantCount(safeCount);

    if (matchupMode !== "standard" && wasBalanced) {
      const nextMaleCount = Math.max(0, safeCount - femaleCount);

      setMaleCount(nextMaleCount);
      setMaleCountInput(String(nextMaleCount));
    }
  }

  function handleParticipantCountChange(value: string) {
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      setParticipantCountInput(value);
      return;
    }

    applyParticipantCount(parsed, value);
  }

  function commitParticipantCount() {
    setParticipantCountInput(String(participantCount));
  }

  function handleParticipantCountStep(delta: number) {
    applyParticipantCount(participantCount + delta);
  }

  function handleMatchupModeChange(value: MatchupMode) {
    setMatchupMode(value);

    if (value !== "standard" && femaleCount + maleCount !== participantCount) {
      const genderCounts = defaultGenderCounts(participantCount);

      setFemaleCount(genderCounts.femaleCount);
      setFemaleCountInput(String(genderCounts.femaleCount));
      setMaleCount(genderCounts.maleCount);
      setMaleCountInput(String(genderCounts.maleCount));
    }
  }

  function handleFemaleCountChange(value: string) {
    setFemaleCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    setFemaleCount(Math.max(0, parsed));
  }

  function commitFemaleCount() {
    setFemaleCountInput(String(femaleCount));
  }

  function handleFemaleCountStep(delta: number) {
    const nextCount = clampCount(
      femaleCount + delta,
      MATCH_CONDITION_LIMITS.genderCount.min,
      participantCount,
    );

    setFemaleCount(nextCount);
    setFemaleCountInput(String(nextCount));
  }

  function handleMaleCountChange(value: string) {
    setMaleCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    setMaleCount(Math.max(0, parsed));
  }

  function commitMaleCount() {
    setMaleCountInput(String(maleCount));
  }

  function handleMaleCountStep(delta: number) {
    const nextCount = clampCount(
      maleCount + delta,
      MATCH_CONDITION_LIMITS.genderCount.min,
      participantCount,
    );

    setMaleCount(nextCount);
    setMaleCountInput(String(nextCount));
  }

  function handleCourtCountChange(value: string) {
    setCourtCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    const safeCount = clampCount(
      parsed,
      MATCH_CONDITION_LIMITS.courtCount.min,
      MATCH_CONDITION_LIMITS.courtCount.max,
    );

    setCourtCount(safeCount);
  }

  function commitCourtCount() {
    setCourtCountInput(String(courtCount));
  }

  function handleCourtCountStep(delta: number) {
    const nextCount = clampCount(
      courtCount + delta,
      MATCH_CONDITION_LIMITS.courtCount.min,
      MATCH_CONDITION_LIMITS.courtCount.max,
    );

    setCourtCount(nextCount);
    setCourtCountInput(String(nextCount));
  }

  function handleRoundCountChange(value: string) {
    setRoundCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    const safeCount = clampCount(
      parsed,
      MATCH_CONDITION_LIMITS.roundCount.min,
      MATCH_CONDITION_LIMITS.roundCount.max,
    );

    setRoundCount(safeCount);
  }

  function commitRoundCount() {
    setRoundCountInput(String(roundCount));
  }

  function handleRoundCountStep(delta: number) {
    const nextCount = clampCount(
      roundCount + delta,
      MATCH_CONDITION_LIMITS.roundCount.min,
      MATCH_CONDITION_LIMITS.roundCount.max,
    );

    setRoundCount(nextCount);
    setRoundCountInput(String(nextCount));
  }

  function currentInput() {
    return createAutoMatchConditionInput({
      eventName,
      matchupMode,
      participantCount,
      femaleCount,
      maleCount,
      courtCount,
      roundCount,
    });
  }

  function nextSeed() {
    return Math.floor(Date.now() % 1_000_000_000) + rerollCount;
  }

  function hideCompletionMessage() {
    if (completionMessageTimerRef.current !== null) {
      window.clearTimeout(completionMessageTimerRef.current);
      completionMessageTimerRef.current = null;
    }

    setCompletionMessage(null);
  }

  function showCompletionMessage() {
    hideCompletionMessage();
    setCompletionMessage("作成/再作成が完了しました。");
    completionMessageTimerRef.current = window.setTimeout(() => {
      setCompletionMessage(null);
      completionMessageTimerRef.current = null;
    }, 3000);
  }

  function suggestedCourtCount(input: MatchConditionInput): number | null {
    if (input.participantCount < MATCH_CONDITION_LIMITS.participantCount.min) {
      return null;
    }

    if (input.participantCount >= input.courtCount * PLAYERS_PER_COURT) {
      return null;
    }

    const adjustedCourtCount = Math.floor(input.participantCount / PLAYERS_PER_COURT);

    return adjustedCourtCount < input.courtCount ? adjustedCourtCount : null;
  }

  function executeGenerate(input: MatchConditionInput, seed: number, isRegeneration: boolean) {
    setSharedResultMessage(null);
    clearPdfError();
    hideCompletionMessage();
    startTransition(() => {
      void (async () => {
        const generatedResult = isRegeneration
          ? await regenerate(input, seed)
          : await generate(input, seed);

        if (generatedResult) {
          showCompletionMessage();
        }
      })();
    });
  }

  function handleGenerate() {
    const input = currentInput();
    const adjustedCourtCount = suggestedCourtCount(input);
    const seed = result ? nextSeed() + 97 : nextSeed();
    const isRegeneration = Boolean(result);

    if (adjustedCourtCount !== null) {
      hideCompletionMessage();
      setPendingCourtCountAdjustment({
        input,
        seed,
        isRegeneration,
        enteredCourtCount: input.courtCount,
        adjustedCourtCount,
      });
      return;
    }

    executeGenerate(input, seed, isRegeneration);
  }

  function handleCancelCourtCountAdjustment() {
    setPendingCourtCountAdjustment(null);
  }

  function handleConfirmCourtCountAdjustment() {
    if (!pendingCourtCountAdjustment) {
      return;
    }

    const adjustedInput = {
      ...pendingCourtCountAdjustment.input,
      courtCount: pendingCourtCountAdjustment.adjustedCourtCount,
    };

    setCourtCount(pendingCourtCountAdjustment.adjustedCourtCount);
    setCourtCountInput(String(pendingCourtCountAdjustment.adjustedCourtCount));
    setPendingCourtCountAdjustment(null);
    executeGenerate(
      adjustedInput,
      pendingCourtCountAdjustment.seed,
      pendingCourtCountAdjustment.isRegeneration,
    );
  }

  function toggleRoundCompletion(roundNumber: number, checked: boolean) {
    setCompletedRoundsState((current) => {
      const generatedAt = result?.generatedAt ?? null;
      const currentCompletedRoundCount =
        current.generatedAt === generatedAt ? current.completedRoundCount : 0;

      if (checked && roundNumber === currentCompletedRoundCount + 1) {
        return {
          generatedAt,
          completedRoundCount: currentCompletedRoundCount + 1,
          lockedCompletedRoundCount:
            current.generatedAt === generatedAt ? current.lockedCompletedRoundCount : 0,
        };
      }

      const lockedCompletedRoundCount =
        current.generatedAt === generatedAt ? current.lockedCompletedRoundCount : 0;

      if (!checked && roundNumber === currentCompletedRoundCount && roundNumber > lockedCompletedRoundCount) {
        return {
          generatedAt,
          completedRoundCount: Math.max(0, currentCompletedRoundCount - 1),
          lockedCompletedRoundCount,
        };
      }

      return current;
    });
  }

  async function handleContinuationSubmit(draft: ContinuationDraft): Promise<boolean> {
    if (!result) {
      return false;
    }

    clearPdfError();
    setSharedResultMessage(null);
    hideCompletionMessage();
    setGenerating(true);

    try {
      const continuation = generateContinuationMatchupUseCase(
        {
          previousResult: result,
          completedRoundCount,
          eligibleParticipantIds,
          additionalRoundCount: draft.additionalRoundCount,
          withdrawnParticipantIds: draft.withdrawnParticipantIds,
          addCount: draft.addCount,
          addFemaleCount: draft.addFemaleCount,
          addMaleCount: draft.addMaleCount,
        },
        nextSeed() + 193,
      );

      setResult(continuation.result, continuation.result.seed, {
        source: "continuation",
        eligibleParticipantIds: continuation.eligibleParticipantIds,
      });
      setCompletedRoundsState({
        generatedAt: continuation.result.generatedAt,
        completedRoundCount,
        lockedCompletedRoundCount: completedRoundCount,
      });
      showCompletionMessage();

      return true;
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("途中再作成できませんでした。条件を見直してください。");
      }

      return false;
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ResponsiveShell>
      {completionMessage ? (
        <div
          data-testid="generation-complete-message"
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-[rgba(240,106,60,0.3)] bg-white px-5 py-3 text-center text-base font-semibold text-[var(--color-ink)] shadow-[0_18px_40px_rgba(53,40,19,0.18)]"
        >
          {completionMessage}
        </div>
      ) : null}

      <header className="relative z-30 mb-5">
        <section className="relative flex min-h-[88px] flex-col justify-center rounded-[2rem] border border-white/65 bg-[linear-gradient(135deg,rgba(244,112,66,0.22),rgba(255,255,255,0.94))] px-5 py-4 shadow-[0_22px_70px_rgba(53,40,19,0.12)] sm:px-6">
          <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-3 lg:flex">
            {canPromptInstall && !isInstalled ? (
              <HoverTooltip
                text="ホーム画面に追加して、アプリのようにすぐ開けるようにします。"
                placement="bottom"
              >
                <button
                  data-testid="install-app-button"
                  type="button"
                  onClick={() => void promptInstall()}
                  className="h-11 min-w-[148px] whitespace-nowrap rounded-full bg-[var(--color-accent)] px-5 text-base font-semibold text-white shadow-[0_10px_24px_rgba(240,106,60,0.22)] transition"
                >
                  ホーム画面追加
                </button>
              </HoverTooltip>
            ) : null}
            <HoverTooltip text="アプリURLを共有、コピー、QRコード表示できます。" placement="bottom">
              <button
                data-testid="open-share-dialog-button"
                type="button"
                onClick={() => setAppShareDialogOpen(true)}
                className="h-11 min-w-[92px] whitespace-nowrap rounded-full border border-[var(--color-line)] bg-white px-5 text-base font-semibold text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] transition hover:border-[var(--color-accent)]"
              >
                共有
              </button>
            </HoverTooltip>
            <Link
              href="/admin"
              aria-label="管理画面を開く"
              title="管理画面"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] transition hover:border-[var(--color-accent)]"
            >
              <Settings size={20} />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Image
              src={withAssetVersion("/icons/icon-192.png?iconv=transparent-v1")}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_10px_22px_rgba(53,40,19,0.14)]"
              loading="eager"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
                Tennis Matchup App
              </p>
              <p className="mt-2 text-base leading-7 text-[var(--color-muted)]">
                ダブルスの対戦表と休憩者をまとめて作成。
              </p>
            </div>
          </div>
        </section>
      </header>

      <main className="grid gap-6">
        <ConditionForm
          eventName={eventName}
          matchupMode={matchupMode}
          participantCount={participantCount}
          participantCountInput={participantCountInput}
          femaleCount={femaleCount}
          femaleCountInput={femaleCountInput}
          maleCount={maleCount}
          maleCountInput={maleCountInput}
          courtCount={courtCount}
          courtCountInput={courtCountInput}
          roundCount={roundCount}
          roundCountInput={roundCountInput}
          isGenerating={isGenerating}
          errorMessage={errorMessage}
          onEventNameChange={setEventName}
          onMatchupModeChange={handleMatchupModeChange}
          onParticipantCountChange={handleParticipantCountChange}
          onParticipantCountCommit={commitParticipantCount}
          onParticipantCountStep={handleParticipantCountStep}
          onFemaleCountChange={handleFemaleCountChange}
          onFemaleCountCommit={commitFemaleCount}
          onFemaleCountStep={handleFemaleCountStep}
          onMaleCountChange={handleMaleCountChange}
          onMaleCountCommit={commitMaleCount}
          onMaleCountStep={handleMaleCountStep}
          onCourtCountChange={handleCourtCountChange}
          onCourtCountCommit={commitCourtCount}
          onCourtCountStep={handleCourtCountStep}
          onRoundCountChange={handleRoundCountChange}
          onRoundCountCommit={commitRoundCount}
          onRoundCountStep={handleRoundCountStep}
          onSubmit={handleGenerate}
        />

        {result ? (
          <>
            {sharedResultMessage ? (
              <section className="rounded-[1.5rem] border border-[rgba(240,106,60,0.22)] bg-[linear-gradient(135deg,rgba(240,106,60,0.12),rgba(255,255,255,0.96))] px-5 py-4 text-base leading-7 text-[var(--color-ink)]">
                {sharedResultMessage}
              </section>
            ) : null}
            {pdfErrorMessage ? (
              <section className="rounded-[1.5rem] border border-[rgba(143,56,34,0.18)] bg-[#fff1ed] px-5 py-4 text-base leading-7 text-[#8f3822]">
                {pdfErrorMessage}
              </section>
            ) : null}

            <section
              data-testid="result-summary"
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-5 rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur md:grid-cols-4 md:gap-4"
            >
              <div className="min-w-0">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
                  Result
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {result.conditions.eventName || "テニス対戦組合せApp"}
                </p>
              </div>
              <div className="flex flex-col items-end justify-start md:order-4 md:justify-end">
                <HoverTooltip
                  text={
                    shareDisabled
                      ? "途中再作成結果は共有URL未対応です。"
                      : "この対戦表をURLまたはQRコードで共有します。"
                  }
                >
                  <button
                    data-testid="open-result-share-button"
                    type="button"
                    disabled={shareDisabled}
                    title={
                      shareDisabled ? "途中再作成結果は共有URL未対応です。" : undefined
                    }
                    onClick={() => setResultShareDialogOpen(true)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-base font-semibold text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    組合せ共有
                  </button>
                </HoverTooltip>
              </div>
              <div className="min-w-0 md:order-2">
                <p className="text-base font-medium text-[var(--color-muted)]">採用シード</p>
                <p data-testid="selected-seed" className="mt-2 text-xl font-semibold">
                  {currentSeed}
                </p>
              </div>
              <div className="min-w-0 md:order-3">
                <p className="text-base font-medium text-[var(--color-muted)]">総合スコア</p>
                <p data-testid="total-score" className="mt-2 text-xl font-semibold">
                  {result.score.totalScore}
                </p>
              </div>
            </section>

            <section className="grid gap-6">
              {result.rounds.map((round) => {
                const completed = round.roundNumber <= completedRoundCount;
                const canCompleteCurrent = !completed && round.roundNumber === completedRoundCount + 1;
                const canReopenLatest =
                  completed &&
                  round.roundNumber === completedRoundCount &&
                  round.roundNumber > lockedCompletedRoundCount;

                return (
                  <RoundCard
                    key={`round-${round.roundNumber}`}
                    round={round}
                    participants={result.conditions.participants}
                    completed={completed}
                    completionDisabled={!canCompleteCurrent && !canReopenLatest}
                    onCompletedChange={(checked) => toggleRoundCompletion(round.roundNumber, checked)}
                  />
                );
              })}
            </section>

            <ContinuationPanel
              result={result}
              eligibleParticipantIds={eligibleParticipantIds}
              completedRoundCount={completedRoundCount}
              isGenerating={isGenerating}
              onSubmit={handleContinuationSubmit}
            />

            <section className="rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur sm:p-6">
              <button
                data-testid="player-stats-toggle"
                type="button"
                aria-expanded={statsExpanded}
                aria-controls="player-stats-panel"
                onClick={() => setStatsExpanded((current) => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-base font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
                    Summary
                  </span>
                  <span className="mt-1 block text-2xl font-semibold">参加者別サマリー</span>
                </span>
                {statsExpanded ? (
                  <ChevronUp size={24} aria-hidden="true" />
                ) : (
                  <ChevronDown size={24} aria-hidden="true" />
                )}
              </button>

              {statsExpanded ? (
                <PlayerStatsTable
                  participants={result.conditions.participants}
                  stats={result.stats}
                  score={result.score}
                />
              ) : null}
            </section>

            <StickyActionBar>
              <HoverTooltip text="現在の組合せを印刷用の別画面で開きます。">
                <button
                  data-testid="print-preview-button"
                  type="button"
                  onClick={() => openPrintPreview(result, { shouldShowShareQr: !shareDisabled })}
                  className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3.5 text-base font-semibold text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] transition"
                >
                  印刷プレビューを開く
                </button>
              </HoverTooltip>
              <HoverTooltip text="現在の組合せをPDFファイルとして出力します。">
                <button
                  data-testid="pdf-export-button"
                  type="button"
                  onClick={() => void exportPdf(result, { shouldShowShareQr: !shareDisabled })}
                  disabled={isExportingPdf}
                  className="rounded-full bg-[var(--color-accent)] px-6 py-3.5 text-base font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExportingPdf ? "PDF出力中..." : "PDFを出力"}
                </button>
              </HoverTooltip>
            </StickyActionBar>
          </>
        ) : null}
      </main>
      {appShareDialogOpen ? (
        <AppShareDialog open={appShareDialogOpen} onClose={() => setAppShareDialogOpen(false)} />
      ) : null}
      {resultShareDialogOpen ? (
        <ResultShareDialog
          open={resultShareDialogOpen}
          result={result}
          onClose={() => setResultShareDialogOpen(false)}
        />
      ) : null}
      {pendingCourtCountAdjustment ? (
        <CourtCountAdjustmentDialog
          enteredCourtCount={pendingCourtCountAdjustment.enteredCourtCount}
          adjustedCourtCount={pendingCourtCountAdjustment.adjustedCourtCount}
          onCancel={handleCancelCourtCountAdjustment}
          onConfirm={handleConfirmCourtCountAdjustment}
        />
      ) : null}
    </ResponsiveShell>
  );
}
