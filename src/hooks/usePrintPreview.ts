"use client";

import { formatPrintModel } from "@/features/matchmaking/application/formatPrintModel";
import type { MatchupResult } from "@/features/matchmaking/model/types";
import { PRINT_STORAGE_KEY } from "@/lib/constants/ui";

export function usePrintPreview() {
  function openPrintPreview(result: MatchupResult) {
    const printModel = formatPrintModel(result);
    localStorage.setItem(PRINT_STORAGE_KEY, JSON.stringify(printModel));
    window.open("/print", "_blank", "noopener,noreferrer");
  }

  return {
    openPrintPreview,
  };
}
