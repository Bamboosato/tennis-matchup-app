import type {
  CourtAssignment,
  MatchupResult,
  Participant,
  RoundResult,
} from "../../model/types";

export const PDF_ROUNDS_PER_PAGE = 12;
const PDF_TYPOGRAPHY_DENSITY_ROUNDS_CAP = 10;

export type PdfTypography = {
  titleFontSize: number;
  metaLabelFontSize: number;
  metaValueFontSize: number;
  tableHeaderFontSize: number;
  tableBodyFontSize: number;
  roundFontSize: number;
  footerFontSize: number;
};

export type PdfTableRow = {
  roundLabel: string;
  courtCells: string[];
  restCell: string;
};

export type PdfPageModel = {
  pageNumber: number;
  rows: PdfTableRow[];
};

export type PdfDocumentModel = {
  eventName: string;
  roundCount: number;
  courtCount: number;
  participantCount: number;
  pages: PdfPageModel[];
  typography: PdfTypography;
};

function createParticipantNameMap(participants: Participant[]) {
  return new Map(participants.map((participant) => [participant.id, participant.name]));
}

function formatPairName(
  player1Id: string,
  player2Id: string,
  participantNameById: Map<string, string>,
) {
  const player1Name = participantNameById.get(player1Id) ?? player1Id;
  const player2Name = participantNameById.get(player2Id) ?? player2Id;

  return `${player1Name} / ${player2Name}`;
}

function formatCourtCell(
  court: CourtAssignment,
  participantNameById: Map<string, string>,
) {
  if (court.isUnused || !court.pairA || !court.pairB) {
    return "未使用";
  }

  return [
    formatPairName(court.pairA.player1Id, court.pairA.player2Id, participantNameById),
    formatPairName(court.pairB.player1Id, court.pairB.player2Id, participantNameById),
  ].join("\n");
}

function formatRestCell(
  restPlayerIds: string[],
  participantNameById: Map<string, string>,
) {
  if (restPlayerIds.length === 0) {
    return "-";
  }

  return restPlayerIds
    .map((playerId) => participantNameById.get(playerId) ?? playerId)
    .join(", ");
}

function buildPdfRow(
  round: RoundResult,
  participantNameById: Map<string, string>,
): PdfTableRow {
  return {
    roundLabel: String(round.roundNumber),
    courtCells: round.courts.map((court) => formatCourtCell(court, participantNameById)),
    restCell: formatRestCell(round.restPlayerIds, participantNameById),
  };
}

export function pickPdfTypography(params: {
  courtCount: number;
  participantCount: number;
  roundsOnPage: number;
}): PdfTypography {
  const densityRounds = Math.min(params.roundsOnPage, PDF_TYPOGRAPHY_DENSITY_ROUNDS_CAP);
  const densityScore =
    Math.max(0, params.courtCount - 2) * 1.2 +
    Math.max(0, densityRounds - 6) * 0.35 +
    Math.max(0, params.participantCount - 8) * 0.12;

  const tableBodyFontSize = Math.max(7.2, 10.6 - densityScore);
  const tableHeaderFontSize = Math.max(7.8, tableBodyFontSize + 0.4);
  const roundFontSize = Math.max(8, tableBodyFontSize + 0.8);
  const titleFontSize = params.courtCount >= 4 ? 18 : 20;
  const metaValueFontSize = params.courtCount >= 4 ? 14 : 16;

  return {
    titleFontSize,
    metaLabelFontSize: 8,
    metaValueFontSize,
    tableHeaderFontSize,
    tableBodyFontSize,
    roundFontSize,
    footerFontSize: 9,
  };
}

export function buildPdfDocumentModel(result: MatchupResult): PdfDocumentModel {
  const participantNameById = createParticipantNameMap(result.conditions.participants);
  const pages: PdfPageModel[] = [];

  for (let offset = 0; offset < result.rounds.length; offset += PDF_ROUNDS_PER_PAGE) {
    pages.push({
      pageNumber: pages.length + 1,
      rows: result.rounds
        .slice(offset, offset + PDF_ROUNDS_PER_PAGE)
        .map((round) => buildPdfRow(round, participantNameById)),
    });
  }

  return {
    eventName: result.conditions.eventName || "テニス対戦組合せApp",
    roundCount: result.conditions.roundCount,
    courtCount: result.conditions.courtCount,
    participantCount: result.conditions.participants.length,
    pages,
    typography: pickPdfTypography({
      courtCount: result.conditions.courtCount,
      participantCount: result.conditions.participants.length,
      roundsOnPage: Math.min(PDF_ROUNDS_PER_PAGE, result.conditions.roundCount),
    }),
  };
}

export function truncateTextToWidth(
  value: string,
  maxWidth: number,
  measureTextWidth: (candidate: string) => number,
) {
  if (measureTextWidth(value) <= maxWidth) {
    return value;
  }

  const ellipsis = "...";
  const chars = Array.from(value);

  if (chars.length === 0 || measureTextWidth(ellipsis) >= maxWidth) {
    return ellipsis;
  }

  let low = 0;
  let high = chars.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${chars.slice(0, mid).join("")}${ellipsis}`;

    if (measureTextWidth(candidate) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return `${chars.slice(0, low).join("")}${ellipsis}`;
}

export function buildPdfFileName(eventName: string) {
  const sanitized = eventName.replace(/[\\/:*?"<>|]/g, "").trim();

  return `${sanitized || "tennis-matchup"}-matchup.pdf`;
}
