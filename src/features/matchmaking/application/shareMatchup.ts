import { z } from "zod";
import { generateMatchup } from "../domain/generateMatchup";
import type { MatchConditionInput, MatchupResult } from "../model/types";
import { buildMatchConditions } from "./buildMatchConditions";
import { APP_SHARE_URL } from "@/lib/constants/ui";

const SHARE_QUERY_VERSION = "1";

const sharedMatchQuerySchema = z.object({
  shared: z.literal("1"),
  v: z.literal(SHARE_QUERY_VERSION),
  event: z.string().optional(),
  participants: z.coerce
    .number({ message: "参加人数を読み込めませんでした" })
    .int("参加人数を読み込めませんでした")
    .min(4, "参加人数を読み込めませんでした"),
  courts: z.coerce
    .number({ message: "コート数を読み込めませんでした" })
    .int("コート数を読み込めませんでした")
    .min(1, "コート数を読み込めませんでした"),
  rounds: z.coerce
    .number({ message: "実施回数を読み込めませんでした" })
    .int("実施回数を読み込めませんでした")
    .min(1, "実施回数を読み込めませんでした"),
  seed: z.coerce
    .number({ message: "採用シードを読み込めませんでした" })
    .int("採用シードを読み込めませんでした")
    .min(0, "採用シードを読み込めませんでした"),
});

function formatParticipantLabel(index: number) {
  return (index + 1).toString().padStart(2, "0");
}

export function createAutoMatchConditionInput(params: {
  eventName?: string;
  participantCount: number;
  courtCount: number;
  roundCount: number;
}): MatchConditionInput {
  return {
    eventName: params.eventName,
    participantCount: params.participantCount,
    courtCount: params.courtCount,
    roundCount: params.roundCount,
    participants: Array.from({ length: params.participantCount }, (_, index) => ({
      id: `player-${formatParticipantLabel(index)}`,
      name: formatParticipantLabel(index),
    })),
  };
}

export function buildSharedMatchUrl(
  result: MatchupResult,
  baseUrl = APP_SHARE_URL,
): string {
  const url = new URL(baseUrl);

  url.searchParams.set("shared", "1");
  url.searchParams.set("v", SHARE_QUERY_VERSION);
  url.searchParams.set("participants", String(result.conditions.participants.length));
  url.searchParams.set("courts", String(result.conditions.courtCount));
  url.searchParams.set("rounds", String(result.conditions.roundCount));
  url.searchParams.set("seed", String(result.seed));

  if (result.conditions.eventName) {
    url.searchParams.set("event", result.conditions.eventName);
  }

  return url.toString();
}

export function restoreSharedMatchupFromSearch(search: string): {
  input: MatchConditionInput;
  result: MatchupResult;
} | null {
  const params = new URLSearchParams(search);

  if (params.get("shared") !== "1") {
    return null;
  }

  const parsed = sharedMatchQuerySchema.parse({
    shared: params.get("shared"),
    v: params.get("v"),
    event: params.get("event") ?? undefined,
    participants: params.get("participants"),
    courts: params.get("courts"),
    rounds: params.get("rounds"),
    seed: params.get("seed"),
  });

  const input = createAutoMatchConditionInput({
    eventName: parsed.event,
    participantCount: parsed.participants,
    courtCount: parsed.courts,
    roundCount: parsed.rounds,
  });
  const conditions = buildMatchConditions(input);
  const result = generateMatchup(conditions, parsed.seed);

  return {
    input,
    result,
  };
}
