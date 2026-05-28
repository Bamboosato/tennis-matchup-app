import { beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { autoTable } from "jspdf-autotable";
import type { MatchupResult, Participant, RoundResult } from "../../model/types";
import { exportMatchupPdf } from "./exportMatchupPdf";

const pdfMockState = vi.hoisted(() => ({
  textCalls: [] as Array<{ text: string; x: number; y: number }>,
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
  },
}));

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = {
      pageSize: {
        getWidth: () => 595,
        getHeight: () => 842,
      },
    };

    addFileToVFS() {}
    addFont() {}
    addImage() {}
    addPage() {}
    getTextWidth(value: string) {
      return value.length;
    }
    line() {}
    roundedRect() {}
    save() {}
    setDrawColor() {}
    setFillColor() {}
    setFont() {}
    setFontSize() {}
    setLineWidth() {}
    setTextColor() {}
    text(value: unknown, x: number, y: number) {
      pdfMockState.textCalls.push({ text: String(value), x, y });
    }
  },
}));

vi.mock("jspdf-autotable", () => ({
  autoTable: vi.fn(),
}));

function participants(count: number): Participant[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${String(index + 1).padStart(2, "0")}`,
    name: String(index + 1).padStart(2, "0"),
    index,
  }));
}

function round(roundNumber: number): RoundResult {
  return {
    roundNumber,
    activePlayerIds: ["player-01", "player-02", "player-03", "player-04"],
    restPlayerIds: [],
    courts: [
      {
        courtNumber: 1,
        isUnused: false,
        pairA: {
          player1Id: "player-01",
          player2Id: "player-02",
        },
        pairB: {
          player1Id: "player-03",
          player2Id: "player-04",
        },
      },
    ],
  };
}

function result(): MatchupResult {
  return {
    conditions: {
      eventName: "週末テニス会",
      matchFormat: "doubles",
      matchupMode: "standard",
      participants: participants(4),
      courtCount: 1,
      roundCount: 1,
      playersPerCourt: 4,
    },
    rounds: [round(1)],
    stats: [],
    seed: 42,
    score: {
      fairnessPenalty: 0,
      consecutiveRestPenalty: 0,
      genderPreferencePenalty: 0,
      encounterPenalty: 0,
      sameTeammatePenalty: 0,
      sameOpponentPenalty: 0,
      totalScore: 0,
    },
    generatedAt: "2026-05-18T00:00:00.000Z",
  };
}

describe("exportMatchupPdf", () => {
  beforeEach(() => {
    pdfMockState.textCalls = [];
    vi.mocked(autoTable).mockClear();
    vi.mocked(QRCode.toDataURL).mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1)),
      }),
    );
  });

  it("skips shared QR generation when share QR is disabled", async () => {
    await exportMatchupPdf(result(), "https://example.com/", {
      shouldShowShareQr: false,
    });

    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });

  it("generates shared QR for shareable results", async () => {
    await exportMatchupPdf(result(), "https://example.com/", {
      shouldShowShareQr: true,
    });

    expect(QRCode.toDataURL).toHaveBeenCalledOnce();
  });

  it("draws court matchups with a vs separator without increasing row height", async () => {
    await exportMatchupPdf(result(), "https://example.com/", {
      shouldShowShareQr: false,
    });

    const autoTableOptions = vi.mocked(autoTable).mock.calls[0]?.[1] as
      | {
          bodyStyles: { minCellHeight: number };
          didDrawCell: (hookData: {
            section: string;
            column: { index: number };
            cell: { raw: string; x: number; y: number; width: number; height: number };
          }) => void;
        }
      | undefined;

    expect(autoTableOptions?.bodyStyles.minCellHeight).toBe(48);

    autoTableOptions?.didDrawCell({
      section: "body",
      column: { index: 1 },
      cell: {
        raw: "01 / 02\n03 / 04",
        x: 100,
        y: 200,
        width: 160,
        height: 48,
      },
    });

    const courtTextCalls = pdfMockState.textCalls.filter((call) =>
      ["01 / 02", "vs", "03 / 04"].includes(call.text),
    );

    expect(courtTextCalls.map((call) => call.text)).toEqual(["01 / 02", "vs", "03 / 04"]);
    expect(courtTextCalls.map((call) => call.x)).toEqual([180, 180, 180]);
    expect(courtTextCalls.every((call) => call.y > 200 && call.y < 248)).toBe(true);
    expect(courtTextCalls[0]!.y).toBeLessThan(courtTextCalls[1]!.y);
    expect(courtTextCalls[1]!.y).toBeLessThan(courtTextCalls[2]!.y);
  });
});
