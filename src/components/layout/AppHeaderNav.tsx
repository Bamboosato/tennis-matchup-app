"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { withAssetVersion } from "@/lib/constants/assets";

type AppHeaderNavProps = {
  canPromptInstall: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
  onOpenInstallGuide: () => void;
  onOpenAppShare: () => void;
};

const navButtonClass =
  "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition";
const activeNavButtonClass =
  "border border-[rgba(240,106,60,0.32)] bg-[rgba(240,106,60,0.14)] text-[var(--color-ink)]";
const passiveNavButtonClass =
  "border border-transparent text-[var(--color-muted)] hover:border-[var(--color-line)] hover:bg-white/70 hover:text-[var(--color-ink)]";
const menuItemClass =
  "flex w-full items-center justify-between gap-3 rounded-[1rem] px-4 py-3 text-left text-base font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-surface)]";

export function AppHeaderNav({
  canPromptInstall,
  isInstalled,
  onInstall,
  onOpenInstallGuide,
  onOpenAppShare,
}: AppHeaderNavProps) {
  const [desktopGuideOpen, setDesktopGuideOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const closeMenus = useCallback(() => {
    setDesktopGuideOpen(false);
    setMobileMenuOpen(false);
    setMobileGuideOpen(false);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeMenus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenus]);

  function handleOpenAppShare() {
    closeMenus();
    onOpenAppShare();
  }

  function handleOpenInstallGuide() {
    closeMenus();

    if (canPromptInstall && !isInstalled) {
      void onInstall();
      return;
    }

    onOpenInstallGuide();
  }

  return (
    <header ref={headerRef} data-testid="app-header" className="sticky top-5 z-30 mb-5">
      <section className="relative rounded-[1.6rem] border border-white/65 bg-[linear-gradient(135deg,rgba(244,112,66,0.2),rgba(255,255,255,0.96))] px-4 py-3 shadow-[0_18px_54px_rgba(53,40,19,0.13)] backdrop-blur sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Image
              src={withAssetVersion("/icons/icon-192.png?iconv=transparent-v1")}
              alt=""
              width={52}
              height={52}
              unoptimized
              className="h-12 w-12 shrink-0 rounded-[1.1rem] shadow-[0_10px_22px_rgba(53,40,19,0.14)] sm:h-14 sm:w-14"
              loading="eager"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
                Tennis Matchup App
              </p>
              <nav
                data-testid="desktop-primary-nav"
                aria-label="メインメニュー"
                className="mt-3 hidden flex-wrap items-center gap-2 lg:flex"
              >
                <Link
                  href="/"
                  aria-current="page"
                  data-testid="desktop-doubles-tab"
                  className={`${navButtonClass} ${activeNavButtonClass}`}
                >
                  対戦表(ダブルス)
                </Link>
                <span
                  data-testid="desktop-singles-tab"
                  aria-disabled="true"
                  className={`${navButtonClass} cursor-not-allowed border border-[var(--color-line)] bg-white/55 text-[var(--color-muted)] opacity-80`}
                >
                  対戦表(シングルス)
                  <span className="ml-2 rounded-full bg-[rgba(47,38,27,0.08)] px-2 py-0.5 text-xs font-semibold">
                    近日公開予定
                  </span>
                </span>
                <div className="relative">
                  <button
                    data-testid="desktop-guide-menu-button"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={desktopGuideOpen}
                    onClick={() => setDesktopGuideOpen((current) => !current)}
                    className={`${navButtonClass} ${passiveNavButtonClass} gap-1.5`}
                  >
                    操作ガイド
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      className={`transition ${desktopGuideOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {desktopGuideOpen ? (
                    <div
                      data-testid="desktop-guide-menu"
                      role="menu"
                      className="absolute left-0 top-[calc(100%+10px)] z-40 w-60 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-2 shadow-[0_18px_50px_rgba(53,40,19,0.16)]"
                    >
                      <button
                        data-testid="install-app-button"
                        role="menuitem"
                        type="button"
                        onClick={handleOpenInstallGuide}
                        className={menuItemClass}
                      >
                        ホーム画面追加
                      </button>
                      <HoverTooltip text="アプリURLを共有、コピー、QRコード表示できます。" placement="bottom">
                        <button
                          data-testid="open-share-dialog-button"
                          role="menuitem"
                          type="button"
                          onClick={handleOpenAppShare}
                          className={menuItemClass}
                        >
                          アプリ共有
                        </button>
                      </HoverTooltip>
                    </div>
                  ) : null}
                </div>
                <Link
                  href="/admin"
                  data-testid="admin-nav-link"
                  className={`${navButtonClass} ${passiveNavButtonClass}`}
                >
                  管理用
                </Link>
              </nav>
            </div>
          </div>

          <HoverTooltip text="メニューを開閉します。" placement="bottom">
            <button
              data-testid="mobile-menu-button"
              type="button"
              aria-label={mobileMenuOpen ? "メニューを閉じる" : "メニューを開く"}
              aria-expanded={mobileMenuOpen}
              onClick={() => {
                setMobileMenuOpen((current) => !current);
                setMobileGuideOpen(false);
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-white text-[var(--color-ink)] shadow-[0_10px_24px_rgba(53,40,19,0.08)] lg:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          </HoverTooltip>
        </div>

        {mobileMenuOpen ? (
          <div
            data-testid="mobile-nav-menu"
            className="absolute left-4 right-4 top-[calc(100%+10px)] z-40 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-3 shadow-[0_18px_48px_rgba(53,40,19,0.14)] lg:hidden"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                Menu
              </p>
            </div>
            <div className="grid gap-1">
              <Link
                href="/"
                aria-current="page"
                data-testid="mobile-doubles-tab"
                onClick={closeMenus}
                className={`${menuItemClass} bg-[rgba(240,106,60,0.12)]`}
              >
                対戦表(ダブルス)
              </Link>
              <div
                data-testid="mobile-singles-tab"
                aria-disabled="true"
                className={`${menuItemClass} cursor-not-allowed text-[var(--color-muted)] opacity-80`}
              >
                <span>対戦表(シングルス)</span>
                <span className="rounded-full bg-[rgba(47,38,27,0.08)] px-2 py-1 text-xs font-semibold">
                  近日公開予定
                </span>
              </div>
              <button
                data-testid="mobile-guide-menu-button"
                type="button"
                aria-haspopup="menu"
                aria-expanded={mobileGuideOpen}
                onClick={() => setMobileGuideOpen((current) => !current)}
                className={menuItemClass}
              >
                <span>操作ガイド</span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`transition ${mobileGuideOpen ? "rotate-180" : ""}`}
                />
              </button>
              {mobileGuideOpen ? (
                <div
                  data-testid="mobile-guide-menu"
                  role="menu"
                  className="ml-3 grid gap-1 border-l border-[var(--color-line)] pl-3"
                >
                  <button
                    data-testid="mobile-install-app-button"
                    role="menuitem"
                    type="button"
                    onClick={handleOpenInstallGuide}
                    className={menuItemClass}
                  >
                    ホーム画面追加
                  </button>
                  <button
                    data-testid="mobile-open-share-dialog-button"
                    role="menuitem"
                    type="button"
                    onClick={handleOpenAppShare}
                    className={menuItemClass}
                  >
                    アプリ共有
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </header>
  );
}
