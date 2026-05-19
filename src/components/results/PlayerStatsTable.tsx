import type { Participant, PlayerStats, ResultScore } from "@/features/matchmaking/model/types";
import { formatParticipantName } from "@/features/matchmaking/application/formatParticipantName";

type PlayerStatsTableProps = {
  participants: Participant[];
  stats: PlayerStats[];
  score: ResultScore;
};

export function PlayerStatsTable({
  participants,
  stats,
  score,
}: PlayerStatsTableProps) {
  return (
    <div id="player-stats-panel" data-testid="player-stats-panel" className="mt-5 grid gap-5">
      <div className="grid grid-cols-2 gap-2 text-base text-[var(--color-muted)] sm:ml-auto sm:w-fit sm:text-right">
        <span>休憩の偏り: {score.fairnessPenalty}</span>
        <span>連続休憩: {score.consecutiveRestPenalty}</span>
        {score.genderPreferencePenalty > 0 ? (
          <span>モード不一致: {score.genderPreferencePenalty}</span>
        ) : null}
        <span>顔合わせ重複: {score.encounterPenalty}</span>
        <span>総合スコア: {score.totalScore}</span>
      </div>

      <div className="overflow-hidden rounded-[1.3rem] border border-[var(--color-line)]">
        <div className="hidden grid-cols-[1.4fr_repeat(4,minmax(0,1fr))] gap-3 bg-[#f8f3ec] px-4 py-3 text-base font-semibold text-[var(--color-ink)] md:grid">
          <span>参加者</span>
          <span>出場回数</span>
          <span>休憩回数</span>
          <span>顔合わせ人数</span>
          <span>連続休憩回数</span>
        </div>
        <div className="divide-y divide-[var(--color-line)]">
          {stats.map((stat) => {
            const participant = participants.find((entry) => entry.id === stat.playerId);

            return (
              <div
                key={stat.playerId}
                className="grid gap-3 bg-white px-4 py-4 text-base md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]"
              >
                <div>
                  <p className="font-semibold">
                    {participant ? formatParticipantName(participant) : stat.playerId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-muted)] md:hidden">出場回数</p>
                  <p>{stat.appearances}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-muted)] md:hidden">休憩回数</p>
                  <p>{stat.rests}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-muted)] md:hidden">顔合わせ人数</p>
                  <p>{stat.uniqueEncounterCount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-muted)] md:hidden">連続休憩回数</p>
                  <p>{stat.consecutiveRestCount}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
