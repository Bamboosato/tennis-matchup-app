import type { Participant, RoundResult } from "@/features/matchmaking/model/types";
import { CourtMatchCard } from "./CourtMatchCard";
import { RestPlayersPanel } from "./RestPlayersPanel";

type RoundCardProps = {
  round: RoundResult;
  participants: Participant[];
  compact?: boolean;
  completed?: boolean;
  onCompletedChange?: (checked: boolean) => void;
};

export function RoundCard({
  round,
  participants,
  compact = false,
  completed = false,
  onCompletedChange,
}: RoundCardProps) {
  return (
    <section
      data-testid={`round-card-${round.roundNumber}`}
      data-completed={completed}
      className={
        compact
          ? "rounded-[1rem] border border-[var(--color-line)] bg-white px-3 py-2 shadow-none print:break-inside-avoid"
          : completed
            ? "rounded-[1.8rem] border border-[#d4cfc4] bg-[repeating-linear-gradient(135deg,rgba(229,226,219,0.96),rgba(229,226,219,0.96)_12px,rgba(244,242,237,0.96)_12px,rgba(244,242,237,0.96)_24px)] p-5 shadow-[0_18px_50px_rgba(53,40,19,0.08)] backdrop-blur sm:p-6 print:break-inside-avoid print:rounded-none print:border print:shadow-none"
            : "rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur sm:p-6 print:break-inside-avoid print:rounded-none print:border print:shadow-none"
      }
    >
      <div className={compact ? "mb-2 flex items-center justify-between gap-2" : "mb-4 flex items-center justify-between gap-3"}>
        <div className={compact ? undefined : "flex items-center gap-3"}>
          <p
            className={
              compact
                ? "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]"
                : "text-base font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]"
            }
          >
            Round {round.roundNumber}
          </p>
          {!compact && onCompletedChange ? (
            <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/80 px-3 py-1.5 text-sm font-medium text-[var(--color-muted)]">
              <input
                data-testid={`round-complete-checkbox-${round.roundNumber}`}
                type="checkbox"
                checked={completed}
                onChange={(event) => onCompletedChange(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              実施済み
            </label>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!compact && completed ? (
            <span
              data-testid={`round-complete-badge-${round.roundNumber}`}
              className="rounded-full border border-[#bdd6c2] bg-[#eef7f0] px-3 py-1.5 text-sm font-semibold text-[#315d3b]"
            >
              完了
            </span>
          ) : null}
          <p
            className={
              compact
                ? "rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]"
                : "rounded-full bg-[var(--color-surface)] px-4 py-2 text-base text-[var(--color-muted)]"
            }
          >
            出場 {round.activePlayerIds.length} 人
          </p>
        </div>
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
