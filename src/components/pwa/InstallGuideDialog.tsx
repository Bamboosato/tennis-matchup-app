import { HoverTooltip } from "@/components/ui/HoverTooltip";

type InstallGuideDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function InstallGuideDialog({
  open,
  onClose,
}: InstallGuideDialogProps) {
  if (!open) {
    return null;
  }

    return (
    <div
      data-testid="install-guide-dialog"
      className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(18,18,18,0.45)] p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-[1.8rem] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
              Install Guide
            </p>
            <h3 className="mt-2 text-2xl font-semibold">ホーム画面追加の案内</h3>
          </div>
          <HoverTooltip text="ホーム画面追加の案内を閉じます。">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--color-line)] px-4 py-2 text-base"
            >
              閉じる
            </button>
          </HoverTooltip>
        </div>

        <div className="mt-5 grid gap-4 text-base leading-8 text-[var(--color-muted)]">
          <div className="rounded-[1.2rem] bg-[var(--color-surface)] p-4">
            <p className="font-semibold text-[var(--color-ink)]">iPhone / iPad</p>
            <p className="mt-2">
              Safari の共有メニューから「ホーム画面に追加」を選んでください。
            </p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--color-surface)] p-4">
            <p className="font-semibold text-[var(--color-ink)]">Android / Chrome</p>
            <p className="mt-2">
              ブラウザメニューの「アプリをインストール」または「ホーム画面に追加」を選んでください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
