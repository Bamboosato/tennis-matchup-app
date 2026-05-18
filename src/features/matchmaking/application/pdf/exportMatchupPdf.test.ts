import { beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import type { MatchupResult, Participant, RoundResult } from "../../model/types";
import { exportMatchupPdf } from "./exportMatchupPdf";

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
    text() {}
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
});
