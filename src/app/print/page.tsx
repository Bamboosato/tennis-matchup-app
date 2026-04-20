"use client";

import { useMemo, useSyncExternalStore } from "react";
import { PrintLayout } from "@/components/print/PrintLayout";
import type { PrintModel } from "@/features/matchmaking/model/types";
import { PRINT_STORAGE_KEY } from "@/lib/constants/ui";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string | null {
  return window.localStorage.getItem(PRINT_STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export default function PrintPage() {
  const rawModel = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const model = useMemo(
    () => (rawModel ? (JSON.parse(rawModel) as PrintModel) : null),
    [rawModel],
  );

  if (!model) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold">印刷対象のデータがありません</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          一度メイン画面で組合せを作成してから、印刷プレビューを開いてください。
        </p>
      </main>
    );
  }

  return (
    <main data-testid="print-page" className="bg-[#f7f4ee] print:bg-white">
      <div className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-white/90 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-sm text-[var(--color-muted)]">
            A4 印刷プレビュー。問題なければ印刷を実行してください。
          </p>
          <button
            data-testid="print-execute-button"
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white"
          >
            印刷する
          </button>
        </div>
      </div>
      <PrintLayout model={model} />
    </main>
  );
}
