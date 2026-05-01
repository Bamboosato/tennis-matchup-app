"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { ConditionForm } from "@/components/conditions/ConditionForm";
import { ResponsiveShell } from "@/components/layout/ResponsiveShell";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import { AppShareDialog } from "@/components/share/AppShareDialog";
import { ResultShareDialog } from "@/components/share/ResultShareDialog";
import { PlayerStatsTable } from "@/components/results/PlayerStatsTable";
import { RoundCard } from "@/components/results/RoundCard";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import {
  createAutoMatchConditionInput,
  restoreSharedMatchupFromSearch,
} from "@/features/matchmaking/application/shareMatchup";
import type { MatchConditionInput, MatchupMode } from "@/features/matchmaking/model/types";
import { useMatchupGeneration } from "@/hooks/useMatchupGeneration";
import { useMatchupPdfExport } from "@/hooks/useMatchupPdfExport";
import { usePrintPreview } from "@/hooks/usePrintPreview";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { useMatchupStore } from "@/stores/matchupStore";

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
    rounds: number[];
  }>({
    generatedAt: null,
    rounds: [],
  });
  const [appShareDialogOpen, setAppShareDialogOpen] = useState(false);
  const [resultShareDialogOpen, setResultShareDialogOpen] = useState(false);
  const [sharedResultMessage, setSharedResultMessage] = useState<string | null>(
    initialSharedLoad.message,
  );
  const result = useMatchupStore((state) => state.result);
  const errorMessage = useMatchupStore((state) => state.errorMessage);
  const isGenerating = useMatchupStore((state) => state.isGenerating);
  const rerollCount = useMatchupStore((state) => state.rerollCount);
  const currentSeed = useMatchupStore((state) => state.currentSeed);
  const setInstalled = useMatchupStore((state) => state.setInstalled);
  const setConditions = useMatchupStore((state) => state.setConditions);
  const setResult = useMatchupStore((state) => state.setResult);
  const setErrorMessage = useMatchupStore((state) => state.setErrorMessage);
  const { generate, regenerate } = useMatchupGeneration();
  const { openPrintPreview } = usePrintPreview();
  const { exportPdf, isExportingPdf, pdfErrorMessage, clearPdfError } = useMatchupPdfExport();
  const { canPromptInstall, installHint, isInstalled, promptInstall } = usePwaInstallPrompt();

  useEffect(() => {
    setInstalled(isInstalled);
  }, [isInstalled, setInstalled]);

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

  function handleParticipantCountChange(value: string) {
    setParticipantCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    const safeCount = Math.max(4, parsed);
    const wasBalanced = femaleCount + maleCount === participantCount;

    setParticipantCount(safeCount);

    if (matchupMode !== "standard" && wasBalanced) {
      const nextMaleCount = Math.max(0, safeCount - femaleCount);

      setMaleCount(nextMaleCount);
      setMaleCountInput(String(nextMaleCount));
    }
  }

  function commitParticipantCount() {
    setParticipantCountInput(String(participantCount));
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

  function handleCourtCountChange(value: string) {
    setCourtCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    const safeCount = Math.max(1, parsed);

    setCourtCount(safeCount);
  }

  function commitCourtCount() {
    setCourtCountInput(String(courtCount));
  }

  function handleRoundCountChange(value: string) {
    setRoundCountInput(value);
    const parsed = parseDraftCount(value);

    if (parsed === null) {
      return;
    }

    const safeCount = Math.max(1, parsed);

    setRoundCount(safeCount);
  }

  function commitRoundCount() {
    setRoundCountInput(String(roundCount));
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

  function handleGenerate() {
    setSharedResultMessage(null);
    clearPdfError();
    startTransition(() => {
      if (result) {
        regenerate(currentInput(), nextSeed() + 97);
        return;
      }

      generate(currentInput(), nextSeed());
    });
  }

  function toggleRoundCompletion(roundNumber: number, checked: boolean) {
    setCompletedRoundsState((current) => {
      const generatedAt = result?.generatedAt ?? null;
      const rounds = current.generatedAt === generatedAt ? current.rounds : [];

      if (checked) {
        return {
          generatedAt,
          rounds: rounds.includes(roundNumber) ? rounds : [...rounds, roundNumber],
        };
      }

      return {
        generatedAt,
        rounds: rounds.filter((value) => value !== roundNumber),
      };
    });
  }

  return (
    <ResponsiveShell>
      <header className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="relative flex min-h-[110px] flex-col justify-center rounded-[2rem] border border-white/65 bg-[linear-gradient(135deg,rgba(244,112,66,0.22),rgba(255,255,255,0.94))] px-5 py-4 shadow-[0_22px_70px_rgba(53,40,19,0.12)] sm:min-h-[116px] sm:px-6 sm:py-4">
          <Link
            href="/admin"
            aria-label="管理画面を開く"
            title="管理画面"
            className="absolute right-5 top-4 hidden h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] transition hover:border-[var(--color-accent)] lg:inline-flex"
          >
            <Settings size={20} />
          </Link>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
            Tennis Matchup App
          </p>
          <p className="mt-3 text-base leading-7 text-[var(--color-muted)]">
            ダブルスの対戦表と休憩者をまとめて作成。
          </p>
        </section>

        <div className="grid gap-3">
          <InstallPromptBanner
            canPromptInstall={canPromptInstall}
            installHint={installHint}
            isInstalled={isInstalled}
            onPromptInstall={promptInstall}
            onOpenShareDialog={() => setAppShareDialogOpen(true)}
          />
        </div>
      </header>

      <main className="grid gap-6">
        <ConditionForm
          eventName={eventName}
          matchupMode={matchupMode}
          participantCount={participantCount}
          participantCountInput={participantCountInput}
          femaleCountInput={femaleCountInput}
          maleCountInput={maleCountInput}
          courtCount={courtCount}
          courtCountInput={courtCountInput}
          roundCountInput={roundCountInput}
          isGenerating={isGenerating}
          errorMessage={errorMessage}
          onEventNameChange={setEventName}
          onMatchupModeChange={handleMatchupModeChange}
          onParticipantCountChange={handleParticipantCountChange}
          onParticipantCountCommit={commitParticipantCount}
          onFemaleCountChange={handleFemaleCountChange}
          onFemaleCountCommit={commitFemaleCount}
          onMaleCountChange={handleMaleCountChange}
          onMaleCountCommit={commitMaleCount}
          onCourtCountChange={handleCourtCountChange}
          onCourtCountCommit={commitCourtCount}
          onRoundCountChange={handleRoundCountChange}
          onRoundCountCommit={commitRoundCount}
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
              <div className="flex items-start justify-end md:order-4 md:items-end">
                <HoverTooltip text="この対戦表をURLまたはQRコードで共有します。">
                  <button
                    data-testid="open-result-share-button"
                    type="button"
                    onClick={() => setResultShareDialogOpen(true)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-base font-semibold text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)]"
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
              {result.rounds.map((round) => (
                <RoundCard
                  key={`round-${round.roundNumber}`}
                  round={round}
                  participants={result.conditions.participants}
                  completed={
                    completedRoundsState.generatedAt === result.generatedAt &&
                    completedRoundsState.rounds.includes(round.roundNumber)
                  }
                  onCompletedChange={(checked) => toggleRoundCompletion(round.roundNumber, checked)}
                />
              ))}
            </section>

            <PlayerStatsTable
              participants={result.conditions.participants}
              stats={result.stats}
              score={result.score}
            />

            <StickyActionBar>
              <HoverTooltip text="現在の組合せを印刷用の別画面で開きます。">
                <button
                  data-testid="print-preview-button"
                  type="button"
                  onClick={() => openPrintPreview(result)}
                  className="rounded-full bg-[var(--color-accent)] px-6 py-3.5 text-base font-semibold text-white"
                >
                  印刷プレビューを開く
                </button>
              </HoverTooltip>
              <HoverTooltip text="現在の組合せをPDFファイルとして出力します。">
                <button
                  data-testid="pdf-export-button"
                  type="button"
                  onClick={() => void exportPdf(result)}
                  disabled={isExportingPdf}
                  className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3.5 text-base font-semibold text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] transition disabled:cursor-not-allowed disabled:opacity-60"
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
    </ResponsiveShell>
  );
}
