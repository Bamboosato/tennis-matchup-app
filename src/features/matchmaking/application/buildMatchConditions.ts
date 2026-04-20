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
    participants: parsed.participants.map((participant, index) => ({
      id: participant.id,
      name: participant.name,
      index,
    })),
    courtCount: parsed.courtCount,
    roundCount: parsed.roundCount,
    playersPerCourt: 4,
  };
}
