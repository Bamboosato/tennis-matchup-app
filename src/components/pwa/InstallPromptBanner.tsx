"use client";

type InstallPromptBannerProps = {
  canPromptInstall: boolean;
  installHint: string;
  isInstalled: boolean;
  onPromptInstall: () => Promise<boolean>;
};

export function InstallPromptBanner({
  canPromptInstall,
  installHint,
  isInstalled,
  onPromptInstall,
}: InstallPromptBannerProps) {
  if (isInstalled) {
    return null;
  }

  return (
    <section
      data-testid="install-prompt-banner"
      className="flex min-h-[110px] items-center justify-center rounded-[1.7rem] border border-[rgba(240,106,60,0.22)] bg-[linear-gradient(135deg,rgba(240,106,60,0.16),rgba(255,255,255,0.96))] px-4 py-4 sm:min-h-[116px] sm:px-5"
    >
      <div className="flex w-full items-center justify-center">
        {canPromptInstall ? (
          <div className="flex justify-center">
            <button
              data-testid="install-app-button"
              type="button"
              onClick={() => void onPromptInstall()}
              className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-white whitespace-nowrap shadow-[0_10px_24px_rgba(240,106,60,0.22)]"
            >
              ホーム画面追加
            </button>
          </div>
        ) : (
          <p className="text-center text-sm leading-6 text-[var(--color-muted)]">
            {installHint}
          </p>
        )}
      </div>
    </section>
  );
}
