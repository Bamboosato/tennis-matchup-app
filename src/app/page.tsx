"use client";

import { startTransition, useEffect, useState } from "react";
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
import { useMatchupGeneration } from "@/hooks/useMatchupGeneration";
import { usePrintPreview } from "@/hooks/usePrintPreview";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { useMatchupStore } from "@/stores/matchupStore";

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
  const [courtCount, setCourtCount] = useState(initialSharedLoad.restored?.input.courtCount ?? 2);
  const [roundCount, setRoundCount] = useState(initialSharedLoad.restored?.input.roundCount ?? 4);
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

  function handleParticipantCountChange(nextCount: number) {
    const safeCount = Number.isFinite(nextCount) ? Math.max(4, nextCount) : 4;

    setParticipantCount(safeCount);
  }

  function handleCourtCountChange(nextCount: number) {
    const safeCount = Number.isFinite(nextCount) ? Math.max(1, nextCount) : 1;

    setCourtCount(safeCount);
  }

  function handleRoundCountChange(nextCount: number) {
    const safeCount = Number.isFinite(nextCount) ? Math.max(1, nextCount) : 1;

    setRoundCount(safeCount);
  }

  function currentInput() {
    return createAutoMatchConditionInput({
      eventName,
      participantCount,
      courtCount,
      roundCount,
    });
  }

  function nextSeed() {
    return Math.floor(Date.now() % 1_000_000_000) + rerollCount;
  }

  function handleGenerate() {
    setSharedResultMessage(null);
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
        <section className="flex min-h-[110px] flex-col justify-center rounded-[2rem] border border-white/65 bg-[linear-gradient(135deg,rgba(244,112,66,0.22),rgba(255,255,255,0.94))] px-5 py-4 shadow-[0_22px_70px_rgba(53,40,19,0.12)] sm:min-h-[116px] sm:px-6 sm:py-4">
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
          participantCount={participantCount}
          courtCount={courtCount}
          roundCount={roundCount}
          isGenerating={isGenerating}
          errorMessage={errorMessage}
          onEventNameChange={setEventName}
          onParticipantCountChange={handleParticipantCountChange}
          onCourtCountChange={handleCourtCountChange}
          onRoundCountChange={handleRoundCountChange}
          onSubmit={handleGenerate}
        />

        {result ? (
          <>
            {sharedResultMessage ? (
              <section className="rounded-[1.5rem] border border-[rgba(240,106,60,0.22)] bg-[linear-gradient(135deg,rgba(240,106,60,0.12),rgba(255,255,255,0.96))] px-5 py-4 text-base leading-7 text-[var(--color-ink)]">
                {sharedResultMessage}
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
