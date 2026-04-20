import type { CourtAssignment, Participant } from "@/features/matchmaking/model/types";

type CourtMatchCardProps = {
  court: CourtAssignment;
  participants: Participant[];
  compact?: boolean;
};

function findName(participants: Participant[], playerId: string): string {
  return participants.find((participant) => participant.id === playerId)?.name ?? playerId;
}

export function CourtMatchCard({ court, participants, compact = false }: CourtMatchCardProps) {
  if (court.isUnused || !court.pairA || !court.pairB) {
    return (
      <div
        className={
          compact
            ? "rounded-[0.9rem] border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2"
            : "rounded-[1.3rem] border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] p-4"
        }
      >
        <p className={compact ? "text-[11px] font-semibold text-[var(--color-muted)]" : "text-sm font-semibold text-[var(--color-muted)]"}>
          コート {court.courtNumber}
        </p>
        <p className={compact ? "mt-1 text-[11px] text-[var(--color-muted)]" : "mt-3 text-sm text-[var(--color-muted)]"}>
          この回では未使用です。
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-[0.8rem] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          Court {court.courtNumber}
        </p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          <div className="rounded-[0.65rem] bg-white px-2 py-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">A</p>
            <p className="mt-0.5 text-[18px] leading-none font-semibold tracking-[0.02em]">
              {findName(participants, court.pairA.player1Id)} / {findName(participants, court.pairA.player2Id)}
            </p>
          </div>
          <div className="rounded-[0.65rem] bg-white px-2 py-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">B</p>
            <p className="mt-0.5 text-[18px] leading-none font-semibold tracking-[0.02em]">
              {findName(participants, court.pairB.player1Id)} / {findName(participants, court.pairB.player2Id)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.3rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[0_8px_24px_rgba(53,40,19,0.04)]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        Court {court.courtNumber}
      </p>
      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Pair A
          </p>
          <p className="mt-2 text-base font-semibold">
            {findName(participants, court.pairA.player1Id)} / {findName(participants, court.pairA.player2Id)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Pair B
          </p>
          <p className="mt-2 text-base font-semibold">
            {findName(participants, court.pairB.player1Id)} / {findName(participants, court.pairB.player2Id)}
          </p>
        </div>
      </div>
    </div>
  );
}
