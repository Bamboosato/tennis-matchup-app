import type { Participant } from "../model/types";

const GENDER_MARKERS = {
  female: "F",
  male: "M",
} as const;

export function formatParticipantName(participant: Participant): string {
  if (!participant.gender) {
    return participant.name;
  }

  return `${participant.name}${GENDER_MARKERS[participant.gender]}`;
}

export function findParticipantName(participants: Participant[], playerId: string): string {
  const participant = participants.find((entry) => entry.id === playerId);

  return participant ? formatParticipantName(participant) : playerId;
}

export function formatPairParticipantNames(
  participants: Participant[],
  player1Id: string,
  player2Id: string,
): string {
  const formattedPlayers = [player1Id, player2Id]
    .map((playerId, order) => {
      const participant = participants.find((entry) => entry.id === playerId);

      return {
        label: participant ? formatParticipantName(participant) : playerId,
        order,
        sortIndex: participant?.index ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .toSorted((left, right) => {
      if (left.sortIndex !== right.sortIndex) {
        return left.sortIndex - right.sortIndex;
      }

      return left.order - right.order;
    });

  return formattedPlayers.map((player) => player.label).join(" / ");
}
