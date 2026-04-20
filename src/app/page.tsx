"use client";

import { startTransition, useEffect, useState } from "react";
import { ConditionForm } from "@/components/conditions/ConditionForm";
import { ResponsiveShell } from "@/components/layout/ResponsiveShell";
import { StickyActionBar } from "@/components/layout/StickyActionBar";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";
import { PlayerStatsTable } from "@/components/results/PlayerStatsTable";
import { RoundCard } from "@/components/results/RoundCard";
import { useMatchupGeneration } from "@/hooks/useMatchupGeneration";
import { usePrintPreview } from "@/hooks/usePrintPreview";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import type { MatchConditionInput } from "@/features/matchmaking/model/types";
import { useMatchupStore } from "@/stores/matchupStore";

function formatParticipantLabel(index: number) {
  return (index + 1).toString().padStart(2, "0");
}

function createInputModel(params: {
  eventName: string;
  participantCount: number;
  courtCount: number;
  roundCount: number;
}): MatchConditionInput {
  return {
    eventName: params.eventName,
    participantCount: params.participantCount,
    courtCount: params.courtCount,
    roundCount: params.roundCount,
    participants: Array.from({ length: params.participantCount }, (_, index) => ({
      id: `player-${formatParticipantLabel(index)}`,
      name: formatParticipantLabel(index),
    })),
  };
}

export default function HomePage() {
  const [eventName, setEventName] = useState("週末テニス会");
  const [participantCount, setParticipantCount] = useState(8);
  const [courtCount, setCourtCount] = useState(2);
  const [roundCount, setRoundCount] = useState(4);
  const result = useMatchupStore((state) => state.result);
  const errorMessage = useMatchupStore((state) => state.errorMessage);
  const isGenerating = useMatchupStore((state) => state.isGenerating);
  const rerollCount = useMatchupStore((state) => state.rerollCount);
  const currentSeed = useMatchupStore((state) => state.currentSeed);
  const setInstalled = useMatchupStore((state) => state.setInstalled);
  const { generate, regenerate } = useMatchupGeneration();
  const { openPrintPreview } = usePrintPreview();
  const { canPromptInstall, installHint, isInstalled, promptInstall } = usePwaInstallPrompt();

  useEffect(() => {
    setInstalled(isInstalled);
  }, [isInstalled, setInstalled]);

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

  function currentInput(): MatchConditionInput {
    return createInputModel({
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
    startTransition(() => {
      if (result) {
        regenerate(currentInput(), nextSeed() + 97);
        return;
      }

      generate(currentInput(), nextSeed());
    });
  }

  return (
    <ResponsiveShell>
      <header className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="flex min-h-[110px] flex-col justify-center rounded-[2rem] border border-white/65 bg-[linear-gradient(135deg,rgba(244,112,66,0.22),rgba(255,255,255,0.94))] px-5 py-4 shadow-[0_22px_70px_rgba(53,40,19,0.12)] sm:min-h-[116px] sm:px-6 sm:py-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Tennis Matchup App
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)] sm:text-[15px]">
            ダブルスの対戦表と休憩者をまとめて作成。
          </p>
        </section>

        <InstallPromptBanner
          canPromptInstall={canPromptInstall}
          installHint={installHint}
          isInstalled={isInstalled}
          onPromptInstall={promptInstall}
        />
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
            <section
              data-testid="result-summary"
              className="grid gap-4 rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur md:grid-cols-3"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                  Result
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {result.conditions.eventName || "テニス対戦組合せApp"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)]">採用シード</p>
                <p data-testid="selected-seed" className="mt-2 text-xl font-semibold">
                  {currentSeed}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)]">総合スコア</p>
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
                />
              ))}
            </section>

            <PlayerStatsTable
              participants={result.conditions.participants}
              stats={result.stats}
              score={result.score}
            />

            <StickyActionBar>
              <button
                data-testid="print-preview-button"
                type="button"
                onClick={() => openPrintPreview(result)}
                className="rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white"
              >
                印刷プレビューを開く
              </button>
            </StickyActionBar>
          </>
        ) : null}
      </main>
    </ResponsiveShell>
  );
}
