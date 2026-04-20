"use client";

import { HoverTooltip } from "@/components/ui/HoverTooltip";

type InstallPromptBannerProps = {
  canPromptInstall: boolean;
  installHint: string;
  isInstalled: boolean;
  onPromptInstall: () => Promise<boolean>;
  onOpenShareDialog: () => void;
};

export function InstallPromptBanner({
  canPromptInstall,
  installHint,
  isInstalled,
  onPromptInstall,
  onOpenShareDialog,
}: InstallPromptBannerProps) {
  return (
    <section
      data-testid="install-prompt-banner"
      className="flex min-h-[110px] items-center justify-center rounded-[1.7rem] border border-[rgba(240,106,60,0.22)] bg-[linear-gradient(135deg,rgba(240,106,60,0.16),rgba(255,255,255,0.96))] px-4 py-4 sm:min-h-[116px] sm:px-5"
    >
      <div className="flex w-full flex-col items-center gap-4">
        {!isInstalled ? (
          canPromptInstall ? (
            <div className="flex w-full items-center justify-center gap-3">
              <HoverTooltip
                text="ホーム画面に追加して、アプリのようにすぐ開けるようにします。"
                placement="bottom"
              >
                <button
                  data-testid="install-app-button"
                  type="button"
                  onClick={() => void onPromptInstall()}
                  className="min-w-[148px] rounded-full bg-[var(--color-accent)] px-5 py-3.5 text-base font-semibold text-white whitespace-nowrap shadow-[0_10px_24px_rgba(240,106,60,0.22)]"
                >
                  ホーム画面追加
                </button>
              </HoverTooltip>
              <HoverTooltip
                text="アプリURLを共有、コピー、QRコード表示できます。"
                placement="bottom"
              >
                <button
                  data-testid="open-share-dialog-button"
                  type="button"
                  onClick={onOpenShareDialog}
                  className="min-w-[92px] rounded-full border border-[var(--color-line)] bg-white px-5 py-3.5 text-base font-semibold text-[var(--color-ink)] whitespace-nowrap shadow-[0_10px_24px_rgba(53,40,19,0.08)]"
                >
                  共有
                </button>
              </HoverTooltip>
            </div>
          ) : (
            <>
              <p className="text-center text-base leading-7 text-[var(--color-muted)]">
                {installHint}
              </p>
              <HoverTooltip text="アプリURLを共有、コピー、QRコード表示できます。">
                <button
                  data-testid="open-share-dialog-button"
                  type="button"
                  onClick={onOpenShareDialog}
                  className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3.5 text-base font-semibold text-[var(--color-ink)] whitespace-nowrap shadow-[0_10px_24px_rgba(53,40,19,0.08)]"
                >
                  共有
                </button>
              </HoverTooltip>
            </>
          )
        ) : (
          <div className="flex w-full items-center justify-center gap-3">
            <HoverTooltip text="アプリURLを共有、コピー、QRコード表示できます。">
              <button
                data-testid="open-share-dialog-button"
                type="button"
                onClick={onOpenShareDialog}
              className="min-w-[92px] rounded-full border border-[var(--color-line)] bg-white px-5 py-3.5 text-base font-semibold text-[var(--color-ink)] whitespace-nowrap shadow-[0_10px_24px_rgba(53,40,19,0.08)]"
              >
                共有
              </button>
            </HoverTooltip>
          <p className="text-center text-base leading-7 text-[var(--color-muted)]">
            ホーム画面に追加済みです。
          </p>
          </div>
        )}
      </div>
    </section>
  );
}
