import type { Participant, RoundResult } from "@/features/matchmaking/model/types";
import { CourtMatchCard } from "./CourtMatchCard";
import { RestPlayersPanel } from "./RestPlayersPanel";

type RoundCardProps = {
  round: RoundResult;
  participants: Participant[];
  compact?: boolean;
};

export function RoundCard({ round, participants, compact = false }: RoundCardProps) {
  return (
    <section
      data-testid={`round-card-${round.roundNumber}`}
      className={
        compact
          ? "rounded-[1rem] border border-[var(--color-line)] bg-white px-3 py-2 shadow-none print:break-inside-avoid"
          : "rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur sm:p-6 print:break-inside-avoid print:rounded-none print:border print:shadow-none"
      }
    >
      <div className={compact ? "mb-2 flex items-center justify-between gap-2" : "mb-4 flex items-center justify-between gap-3"}>
        <div>
          <p
            className={
              compact
                ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]"
                : "text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]"
            }
          >
            Round {round.roundNumber}
          </p>
        </div>
        <p
          className={
            compact
              ? "rounded-full bg-[var(--color-surface)] px-3 py-1 text-[11px] text-[var(--color-muted)]"
              : "rounded-full bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-muted)]"
          }
        >
          出場 {round.activePlayerIds.length} 人
        </p>
      </div>

      <div
        className={
          compact
            ? "grid gap-1.5 grid-cols-[minmax(0,1fr)_124px]"
            : "grid gap-4 lg:grid-cols-[minmax(0,2fr)_220px]"
        }
      >
        <div className={compact ? "min-w-0" : "overflow-x-auto pb-1"}>
          <div
            className={
              compact
                ? "grid grid-flow-col auto-cols-fr gap-2"
                : "grid min-w-max grid-flow-col auto-cols-[minmax(220px,1fr)] gap-4"
            }
          >
            {round.courts.map((court) => (
              <CourtMatchCard
                key={`round-${round.roundNumber}-court-${court.courtNumber}`}
                court={court}
                participants={participants}
                compact={compact}
              />
            ))}
          </div>
        </div>
        <RestPlayersPanel
          restPlayerIds={round.restPlayerIds}
          participants={participants}
          compact={compact}
        />
      </div>
    </section>
  );
}
