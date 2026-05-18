"use client";

import { formatPrintModel } from "@/features/matchmaking/application/formatPrintModel";
import type { MatchupResult } from "@/features/matchmaking/model/types";
import { PRINT_STORAGE_KEY } from "@/lib/constants/ui";

type OpenPrintPreviewOptions = {
  shouldShowShareQr?: boolean;
};

export function usePrintPreview() {
  function openPrintPreview(result: MatchupResult, options: OpenPrintPreviewOptions = {}) {
    const printModel = formatPrintModel(result, options);
    localStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(printModel));
    window.open("/print", "_blank", "noopener,noreferrer");
  }

  return {
    openPrintPreview,
  };
}
