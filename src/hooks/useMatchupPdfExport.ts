"use client";

import { useState } from "react";
import { exportMatchupPdf } from "@/features/matchmaking/application/pdf/exportMatchupPdf";
import type { MatchupResult } from "@/features/matchmaking/model/types";

function currentOriginUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/`;
}

export function useMatchupPdfExport() {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);

  async function exportPdf(result: MatchupResult) {
    setIsExportingPdf(true);
    setPdfErrorMessage(null);

    try {
      await exportMatchupPdf(result, currentOriginUrl());
    } catch (error) {
      console.error(error);
      setPdfErrorMessage("PDFを出力できませんでした。時間をおいて再試行してください。");
    } finally {
      setIsExportingPdf(false);
    }
  }

  function clearPdfError() {
    setPdfErrorMessage(null);
  }

  return {
    exportPdf,
    isExportingPdf,
    pdfErrorMessage,
    clearPdfError,
  };
}
