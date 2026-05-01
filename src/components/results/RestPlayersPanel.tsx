import type { Participant } from "@/features/matchmaking/model/types";
import { formatParticipantName } from "@/features/matchmaking/application/formatParticipantName";

type RestPlayersPanelProps = {
  restPlayerIds: string[];
  participants: Participant[];
  compact?: boolean;
};

export function RestPlayersPanel({
  restPlayerIds,
  participants,
  compact = false,
}: RestPlayersPanelProps) {
  const restPlayers = participants.filter((participant) =>
    restPlayerIds.includes(participant.id),
  );

  return (
    <aside
        className={
          compact
            ? "rounded-[0.8rem] border border-[var(--color-line)] bg-[#fff6ef] px-2.5 py-1.5"
            : "rounded-[1.3rem] border border-[var(--color-line)] bg-[#fff6ef] p-4"
        }
      >
      <p
        className={
          compact
            ? "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8f522b]"
            : "text-base font-semibold uppercase tracking-[0.14em] text-[#8f522b]"
        }
      >
        休憩者
      </p>
      {restPlayers.length > 0 ? (
        <ul className={compact ? "mt-1 flex flex-wrap gap-1" : "mt-3 flex flex-wrap gap-2"}>
          {restPlayers.map((player) => (
            <li
              key={player.id}
              className={
                compact
                  ? "rounded-full bg-white px-1.5 py-0.5 text-[15px] leading-tight font-medium text-[var(--color-ink)]"
                  : "rounded-full bg-white px-3 py-1.5 text-base font-medium text-[var(--color-ink)]"
              }
            >
              {formatParticipantName(player)}
            </li>
          ))}
        </ul>
      ) : (
        <p className={compact ? "mt-1.5 text-xs text-[var(--color-muted)]" : "mt-3 text-base text-[var(--color-muted)]"}>
          この回の休憩者はいません。
        </p>
      )}
    </aside>
  );
}
