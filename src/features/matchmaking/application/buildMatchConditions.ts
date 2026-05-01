import type { MatchConditionInput, MatchConditions } from "../model/types";
import { matchConditionInputSchema } from "../model/schemas";

export function buildMatchConditions(input: MatchConditionInput): MatchConditions {
  const parsed = matchConditionInputSchema.parse({
    ...input,
    participants: input.participants.map((participant) => ({
      ...participant,
      name: participant.name.trim(),
    })),
    eventName: input.eventName?.trim() || undefined,
  });

  return {
    eventName: parsed.eventName,
    matchupMode: parsed.matchupMode,
    participants: parsed.participants.map((participant, index) => {
      const baseParticipant = {
        id: participant.id,
        name: participant.name,
        index,
      };

      return parsed.matchupMode === "standard"
        ? baseParticipant
        : {
            ...baseParticipant,
            gender: participant.gender,
          };
    }),
    courtCount: parsed.courtCount,
    roundCount: parsed.roundCount,
    playersPerCourt: 4,
  };
}
