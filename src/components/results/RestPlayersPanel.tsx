import type { Participant } from "@/features/matchmaking/model/types";

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
            ? "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a85b2f]"
            : "text-sm font-semibold uppercase tracking-[0.18em] text-[#a85b2f]"
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
                  ? "rounded-full bg-white px-1.5 py-0.5 text-[16px] leading-none font-medium text-[var(--color-ink)]"
                  : "rounded-full bg-white px-3 py-1 text-sm font-medium text-[var(--color-ink)]"
              }
            >
              {player.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className={compact ? "mt-1.5 text-[11px] text-[var(--color-muted)]" : "mt-3 text-sm text-[var(--color-muted)]"}>
          この回の休憩者はいません。
        </p>
      )}
    </aside>
  );
}
