type CourtCountAdjustmentDialogProps = {
  enteredCourtCount: number;
  adjustedCourtCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CourtCountAdjustmentDialog({
  enteredCourtCount,
  adjustedCourtCount,
  onCancel,
  onConfirm,
}: CourtCountAdjustmentDialogProps) {
  return (
    <div
      data-testid="court-count-adjustment-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="court-count-adjustment-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(18,18,18,0.38)] p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-[1.2rem] bg-white px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:px-6">
        <p className="text-sm font-semibold text-[#1b3f8b]">確認</p>
        <h3
          id="court-count-adjustment-title"
          className="mt-3 text-xl font-semibold text-[var(--color-ink)]"
        >
          コート数を調整します
        </h3>

        <p className="mt-6 text-base leading-8 text-[var(--color-ink)]">
          入力されたコート数 {enteredCourtCount}面 は参加人数に対して多いため、
          <br />
          コート数：
          <span className="font-semibold text-[#1b3f8b]">{adjustedCourtCount}面</span>
          で対戦表を作成します。
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            data-testid="court-adjustment-cancel-button"
            type="button"
            onClick={onCancel}
            className="rounded-[0.9rem] border border-[#8bb5ff] bg-white px-5 py-3 text-base font-semibold text-[#1b3f8b] transition hover:bg-[#f4f8ff]"
          >
            キャンセル
          </button>
          <button
            data-testid="court-adjustment-confirm-button"
            type="button"
            onClick={onConfirm}
            className="rounded-[0.9rem] bg-[#2454d6] px-5 py-3 text-base font-semibold text-white transition hover:brightness-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
