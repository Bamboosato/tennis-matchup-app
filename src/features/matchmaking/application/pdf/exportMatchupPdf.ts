"use client";

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import QRCode from "qrcode";
import { withAssetVersion } from "@/lib/constants/assets";
import type { MatchupResult } from "../../model/types";
import { buildSharedMatchUrl } from "../shareMatchup";
import {
  buildPdfDocumentModel,
  buildPdfFileName,
  truncateTextToWidth,
} from "./buildPdfDocumentModel";

const PDF_FONT_URL = withAssetVersion("/fonts/NotoSansJP-VF.ttf");
const PDF_FONT_FILE = "NotoSansJP-VF.ttf";
const PDF_FONT_FAMILY = "NotoSansJP";

const PAGE_MARGIN = 28;
const HEADER_TOP = 24;
const HEADER_BOTTOM = 66;
const FOOTER_HEIGHT = 92;
const QR_SIZE = 72;
const META_CHIP_GAP = 6;
const META_CHIP_HEIGHT = 32;
const META_CHIP_WIDTH = 78;
const EMPHASIS_TEXT_COLOR: [number, number, number] = [24, 18, 12];
const SUBTLE_TEXT_COLOR: [number, number, number] = [117, 104, 88];
const COURT_CELL_FONT_SIZE_BOOST = 1.8;
const REST_CELL_FONT_SIZE_BOOST = 2.2;
const COURT_TEAM_GAP_RATIO = 0.5;

let fontBytesPromise: Promise<string> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function loadPdfFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = fetch(PDF_FONT_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load PDF font: ${response.status}`);
        }

        return response.arrayBuffer();
      })
      .then((buffer) => arrayBufferToBase64(buffer));
  }

  return fontBytesPromise;
}

async function registerPdfFont(doc: jsPDF) {
  const fontBase64 = await loadPdfFontBytes();

  doc.addFileToVFS(PDF_FONT_FILE, fontBase64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_FAMILY, "normal", "Identity-H");
  doc.addFont(PDF_FONT_FILE, PDF_FONT_FAMILY, "bold", "Identity-H");
}

function pageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight();
}

function drawMetaChip(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelFontSize: number,
  valueFontSize: number,
) {
  doc.setFillColor(242, 234, 223);
  doc.setDrawColor(207, 198, 183);
  doc.roundedRect(x, y, META_CHIP_WIDTH, META_CHIP_HEIGHT, 4, 4, "FD");

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(labelFontSize);
  doc.setTextColor(...SUBTLE_TEXT_COLOR);
  doc.text(label, x + 8, y + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(valueFontSize);
  doc.setTextColor(...EMPHASIS_TEXT_COLOR);
  doc.text(value, x + 8, y + 24);
}

function drawHeader(
  doc: jsPDF,
  model: ReturnType<typeof buildPdfDocumentModel>,
) {
  const width = pageWidth(doc);
  const chipTotalWidth = META_CHIP_WIDTH * 3 + META_CHIP_GAP * 2;
  const chipStartX = width - PAGE_MARGIN - chipTotalWidth;
  const titleMaxWidth = chipStartX - PAGE_MARGIN - 12;

  doc.setFont(PDF_FONT_FAMILY, "bold");
  doc.setFontSize(10);
  doc.setTextColor(216, 109, 63);
  doc.text("MATCHUP SHEET", PAGE_MARGIN, HEADER_TOP);

  doc.setFontSize(model.typography.titleFontSize);
  doc.setTextColor(46, 38, 29);
  const eventName = truncateTextToWidth(
    model.eventName,
    titleMaxWidth,
    (candidate) => doc.getTextWidth(candidate),
  );
  doc.text(eventName, PAGE_MARGIN, HEADER_TOP + 24);

  drawMetaChip(
    doc,
    chipStartX,
    HEADER_TOP - 8,
    "ROUNDS",
    String(model.roundCount),
    model.typography.metaLabelFontSize,
    model.typography.metaValueFontSize,
  );
  drawMetaChip(
    doc,
    chipStartX + META_CHIP_WIDTH + META_CHIP_GAP,
    HEADER_TOP - 8,
    "COURTS",
    String(model.courtCount),
    model.typography.metaLabelFontSize,
    model.typography.metaValueFontSize,
  );
  drawMetaChip(
    doc,
    chipStartX + (META_CHIP_WIDTH + META_CHIP_GAP) * 2,
    HEADER_TOP - 8,
    "PLAYERS",
    String(model.participantCount),
    model.typography.metaLabelFontSize,
    model.typography.metaValueFontSize,
  );

  doc.setDrawColor(154, 141, 122);
  doc.setLineWidth(1.2);
  doc.line(PAGE_MARGIN, HEADER_BOTTOM, width - PAGE_MARGIN, HEADER_BOTTOM);
}

function drawFooter(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
  qrCodeDataUrl: string,
) {
  const width = pageWidth(doc);
  const height = pageHeight(doc);
  const qrX = width - PAGE_MARGIN - QR_SIZE;
  const qrY = height - PAGE_MARGIN - QR_SIZE - 8;

  doc.addImage(qrCodeDataUrl, "PNG", qrX, qrY, QR_SIZE, QR_SIZE);

  doc.setFont(PDF_FONT_FAMILY, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SUBTLE_TEXT_COLOR);
  doc.text("組合せQR", qrX + QR_SIZE / 2, qrY + QR_SIZE + 10, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...EMPHASIS_TEXT_COLOR);
  doc.text(`${pageNumber} / ${totalPages}`, width / 2, height - PAGE_MARGIN + 2, {
    align: "center",
  });
}

function buildColumnStyles(doc: jsPDF, courtCount: number, participantCount: number) {
  const usableWidth = pageWidth(doc) - PAGE_MARGIN * 2;
  const roundColumnWidth = 30;
  const restColumnWidth = participantCount >= 12 ? 86 : participantCount >= 8 ? 72 : 60;
  const courtColumnWidth = (usableWidth - roundColumnWidth - restColumnWidth) / courtCount;
  const styles: Record<number, { cellWidth: number; halign?: "center" | "left" | "right" }> = {
    0: { cellWidth: roundColumnWidth, halign: "center" },
  };

  styles[courtCount + 1] = { cellWidth: restColumnWidth, halign: "center" };

  for (let index = 1; index <= courtCount; index += 1) {
    styles[index] = { cellWidth: courtColumnWidth };
  }

  return styles;
}

export async function exportMatchupPdf(result: MatchupResult, baseUrl?: string) {
  const model = buildPdfDocumentModel(result);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });
  const shareUrl = buildSharedMatchUrl(result, baseUrl);
  const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
    margin: 1,
    width: 256,
    color: {
      dark: "#2f261b",
      light: "#ffffff",
    },
  });

  await registerPdfFont(doc);

  model.pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage("a4", "portrait");
    }

    drawHeader(doc, model);

    autoTable(doc, {
      startY: HEADER_BOTTOM + 14,
      margin: {
        top: HEADER_BOTTOM + 14,
        right: PAGE_MARGIN,
        bottom: FOOTER_HEIGHT,
        left: PAGE_MARGIN,
      },
      theme: "grid",
      tableWidth: pageWidth(doc) - PAGE_MARGIN * 2,
      head: [[
        "R",
        ...Array.from({ length: model.courtCount }, (_, index) => `コート${index + 1}`),
        "休憩",
      ]],
      body: page.rows.map((row) => [row.roundLabel, ...row.courtCells, row.restCell]),
      styles: {
        font: PDF_FONT_FAMILY,
        fontStyle: "normal",
        fontSize: model.typography.tableBodyFontSize,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        lineColor: [207, 198, 183],
        lineWidth: 0.6,
        textColor: [46, 38, 29],
        valign: "middle",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [247, 242, 233],
        textColor: [117, 104, 88],
        font: PDF_FONT_FAMILY,
        fontStyle: "bold",
        fontSize: model.typography.tableHeaderFontSize,
        halign: "center",
      },
      bodyStyles: {
        minCellHeight: 48,
      },
      columnStyles: buildColumnStyles(doc, model.courtCount, model.participantCount),
      didParseCell: (hookData) => {
        if (hookData.section !== "body") {
          return;
        }

        if (hookData.column.index === 0) {
          hookData.cell.styles.font = "helvetica";
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.fontSize = model.typography.roundFontSize;
          hookData.cell.styles.halign = "center";
          hookData.cell.styles.textColor = EMPHASIS_TEXT_COLOR;
          return;
        }

        const cellText = hookData.cell.raw instanceof Array
          ? hookData.cell.raw.join("")
          : String(hookData.cell.raw ?? "");

        if (cellText === "未使用") {
          hookData.cell.styles.textColor = [117, 104, 88];
          hookData.cell.styles.halign = "center";
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.font = PDF_FONT_FAMILY;
          return;
        }

        hookData.cell.styles.font = "helvetica";
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fontSize =
          model.typography.tableBodyFontSize +
          (hookData.column.index === model.courtCount + 1
            ? REST_CELL_FONT_SIZE_BOOST
            : COURT_CELL_FONT_SIZE_BOOST);
        hookData.cell.styles.textColor = EMPHASIS_TEXT_COLOR;

        if (hookData.column.index >= 1 && hookData.column.index <= model.courtCount) {
          hookData.cell.styles.halign = "center";
          hookData.cell.text = [""];
        }

        if (hookData.column.index === model.courtCount + 1) {
          hookData.cell.styles.halign = "center";
        }
      },
      didDrawCell: (hookData) => {
        if (hookData.section !== "body") {
          return;
        }

        if (hookData.column.index < 1 || hookData.column.index > model.courtCount) {
          return;
        }

        const cellText = String(hookData.cell.raw ?? "");

        if (!cellText || cellText === "未使用") {
          return;
        }

        const lines = cellText.split("\n");

        if (lines.length !== 2) {
          return;
        }

        const fontSize = model.typography.tableBodyFontSize + COURT_CELL_FONT_SIZE_BOOST;
        const lineGap = fontSize * COURT_TEAM_GAP_RATIO;
        const totalTextHeight = fontSize * lines.length + lineGap;
        const firstBaselineY =
          hookData.cell.y + (hookData.cell.height - totalTextHeight) / 2 + fontSize * 0.9;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(...EMPHASIS_TEXT_COLOR);
        doc.text(lines[0], hookData.cell.x + hookData.cell.width / 2, firstBaselineY, {
          align: "center",
        });
        doc.text(
          lines[1],
          hookData.cell.x + hookData.cell.width / 2,
          firstBaselineY + fontSize + lineGap,
          {
            align: "center",
          },
        );
      },
    });

    drawFooter(doc, page.pageNumber, model.pages.length, qrCodeDataUrl);
  });

  doc.save(buildPdfFileName(model.eventName));
}
