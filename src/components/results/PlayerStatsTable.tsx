import type { Participant, PlayerStats, ResultScore } from "@/features/matchmaking/model/types";

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
    <section className="rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_18px_50px_rgba(53,40,19,0.1)] backdrop-blur sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
            Summary
          </p>
          <h3 className="mt-1 text-2xl font-semibold">人ごとの集計</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-base text-[var(--color-muted)] sm:text-right">
          <span>休憩の偏り: {score.fairnessPenalty}</span>
          <span>連続休憩: {score.consecutiveRestPenalty}</span>
          <span>顔合わせ重複: {score.encounterPenalty}</span>
          <span>総合スコア: {score.totalScore}</span>
        </div>
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
                  <p className="font-semibold">{participant?.name ?? stat.playerId}</p>
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
    </section>
  );
}
