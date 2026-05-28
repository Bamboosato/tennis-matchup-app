type GenerationSummaryProps = {
  participantCount: number;
  courtCount: number;
  playersPerCourt?: 2 | 4;
};

export function GenerationSummary({
  participantCount,
  courtCount,
  playersPerCourt = 4,
}: GenerationSummaryProps) {
  const usableCourtCount = Math.min(courtCount, Math.floor(participantCount / playersPerCourt));
  const activePlayerCount = usableCourtCount * playersPerCourt;
  const restPlayerCount = Math.max(0, participantCount - activePlayerCount);

  return (
    <div className="grid gap-3 rounded-[1.5rem] border border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(244,112,66,0.12),rgba(255,255,255,0.96))] p-4 text-base sm:grid-cols-3">
      <div>
        <p className="font-medium text-[var(--color-muted)]">使用面数</p>
        <p data-testid="summary-usable-courts" className="mt-1 text-2xl font-semibold">
          {usableCourtCount} 面
        </p>
      </div>
      <div>
        <p className="font-medium text-[var(--color-muted)]">1回あたりの出場人数</p>
        <p data-testid="summary-active-players" className="mt-1 text-2xl font-semibold">
          {activePlayerCount} 人
        </p>
      </div>
      <div>
        <p className="font-medium text-[var(--color-muted)]">1回あたりの休憩人数</p>
        <p data-testid="summary-rest-players" className="mt-1 text-2xl font-semibold">
          {restPlayerCount} 人
        </p>
      </div>
    </div>
  );
}
