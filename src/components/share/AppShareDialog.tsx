"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import {
  APP_SHARE_TEXT,
  APP_SHARE_TITLE,
  APP_SHARE_URL,
} from "@/lib/constants/ui";

type AppShareDialogProps = {
  open: boolean;
  onClose: () => void;
};

type ShareNavigator = Navigator & {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  clipboard?: {
    writeText: (value: string) => Promise<void>;
  };
};

export function AppShareDialog({ open, onClose }: AppShareDialogProps) {
  const [showQr, setShowQr] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isPreparingQr, setIsPreparingQr] = useState(false);

  const canNativeShare = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return typeof (navigator as ShareNavigator).share === "function";
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setShowQr(false);
    setFeedbackMessage(null);
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleNativeShare() {
    if (!canNativeShare) {
      setFeedbackMessage("この端末では共有メニューを開けません。URLコピーまたはQRコードをご利用ください。");
      return;
    }

    try {
      await (navigator as ShareNavigator).share?.({
        title: APP_SHARE_TITLE,
        text: APP_SHARE_TEXT,
        url: APP_SHARE_URL,
      });
    } catch {
      setFeedbackMessage("共有メニューを開けませんでした。URLコピーまたはQRコードをご利用ください。");
    }
  }

  async function handleCopyUrl() {
    try {
      await (navigator as ShareNavigator).clipboard?.writeText(APP_SHARE_URL);
      setFeedbackMessage("URLをコピーしました。");
    } catch {
      setFeedbackMessage("URLをコピーできませんでした。手動でコピーしてください。");
    }
  }

  async function handleToggleQr() {
    if (showQr) {
      setShowQr(false);
      return;
    }

    setShowQr(true);
    setFeedbackMessage(null);

    if (qrCodeDataUrl || isPreparingQr) {
      return;
    }

    setIsPreparingQr(true);

    try {
      const qr = await QRCode.toDataURL(APP_SHARE_URL, {
        margin: 1,
        width: 320,
        color: {
          dark: "#2f261b",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(qr);
    } catch {
      setFeedbackMessage("QRコードを生成できませんでした。URL共有をご利用ください。");
    } finally {
      setIsPreparingQr(false);
    }
  }

  return (
    <div
      data-testid="app-share-dialog"
      className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(18,18,18,0.45)] p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-[1.8rem] bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]">
              Share
            </p>
            <h3 className="mt-2 text-2xl font-semibold">アプリURLを共有</h3>
          </div>
          <HoverTooltip text="共有ダイアログを閉じます。">
            <button
              data-testid="share-dialog-close-button"
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--color-line)] px-4 py-2 text-base"
            >
              閉じる
            </button>
          </HoverTooltip>
        </div>

        <div className="mt-5 rounded-[1.2rem] bg-[var(--color-surface)] p-4">
          <p className="text-base font-medium text-[var(--color-muted)]">共有URL</p>
          <p className="mt-2 break-all text-base leading-7 text-[var(--color-ink)]">
            {APP_SHARE_URL}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <HoverTooltip text="端末の共有メニューを開いてURLを送れます。">
            <button
              data-testid="native-share-button"
              type="button"
              onClick={() => void handleNativeShare()}
              className="rounded-[1.2rem] border border-[var(--color-line)] bg-white px-4 py-4 text-base font-semibold text-[var(--color-ink)]"
            >
              共有する
            </button>
          </HoverTooltip>
          <HoverTooltip text="アプリURLをクリップボードへコピーします。">
            <button
              data-testid="copy-url-button"
              type="button"
              onClick={() => void handleCopyUrl()}
              className="rounded-[1.2rem] border border-[var(--color-line)] bg-white px-4 py-4 text-base font-semibold text-[var(--color-ink)]"
            >
              URLをコピー
            </button>
          </HoverTooltip>
          <HoverTooltip text="別端末で読み取れるQRコードを表示または非表示にします。">
            <button
              data-testid="toggle-qr-button"
              type="button"
              onClick={() => void handleToggleQr()}
              className="rounded-[1.2rem] border border-[var(--color-line)] bg-white px-4 py-4 text-base font-semibold text-[var(--color-ink)]"
            >
              {showQr ? "QRコードを閉じる" : "QRコードを表示"}
            </button>
          </HoverTooltip>
        </div>

        {feedbackMessage ? (
          <p
            data-testid="share-feedback"
            className="mt-4 rounded-[1rem] border border-[var(--color-line)] bg-[#faf7f0] px-4 py-3 text-base leading-7 text-[var(--color-muted)]"
          >
            {feedbackMessage}
          </p>
        ) : null}

        {showQr ? (
          <div
            data-testid="share-qr-panel"
            className="mt-5 rounded-[1.4rem] border border-[var(--color-line)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f5f1e8_100%)] p-5"
          >
            <p className="text-base font-medium text-[var(--color-muted)]">
              別端末から読み取る場合はこちら
            </p>
            <div className="mt-4 flex justify-center">
              {qrCodeDataUrl ? (
                <img
                  data-testid="share-qr-image"
                  src={qrCodeDataUrl}
                  alt="アプリURLのQRコード"
                  className="h-56 w-56 rounded-[1.2rem] border border-[var(--color-line)] bg-white p-3"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-[1.2rem] border border-[var(--color-line)] bg-white px-4 text-base leading-7 text-[var(--color-muted)]">
                  {isPreparingQr ? "QRコードを生成中..." : "QRコードを準備できませんでした。"}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
