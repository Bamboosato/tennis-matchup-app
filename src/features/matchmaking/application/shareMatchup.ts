import { z } from "zod";
import { generateMatchup } from "../domain/generateMatchup";
import type { MatchConditionInput, MatchupMode, MatchupResult } from "../model/types";
import { matchupModeSchema } from "../model/schemas";
import { buildMatchConditions } from "./buildMatchConditions";
import { APP_SHARE_URL } from "@/lib/constants/ui";

const SHARE_QUERY_VERSION = "1.10";
const LEGACY_SHARE_QUERY_VERSION = "1.00";

const legacySharedMatchQuerySchema = z.object({
  shared: z.literal("1"),
  v: z.literal(LEGACY_SHARE_QUERY_VERSION),
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

const sharedMatchQuerySchema = legacySharedMatchQuerySchema
  .extend({
    v: z.literal(SHARE_QUERY_VERSION),
    mode: matchupModeSchema.default("standard"),
    female: z.coerce
      .number({ message: "女性人数を読み込めませんでした" })
      .int("女性人数を読み込めませんでした")
      .min(0, "女性人数を読み込めませんでした")
      .optional(),
    male: z.coerce
      .number({ message: "男性人数を読み込めませんでした" })
      .int("男性人数を読み込めませんでした")
      .min(0, "男性人数を読み込めませんでした")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "standard") {
      return;
    }

    if (value.female === undefined || value.male === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["female"],
        message: "共有URLの男女別人数を読み込めませんでした",
      });
      return;
    }

    if (value.female + value.male !== value.participants) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participants"],
        message: "共有URLの参加人数と男女別人数が一致していません",
      });
    }
  });

function formatParticipantLabel(index: number) {
  return (index + 1).toString().padStart(2, "0");
}

export function createAutoMatchConditionInput(params: {
  eventName?: string;
  matchupMode?: MatchupMode;
  participantCount: number;
  femaleCount?: number;
  maleCount?: number;
  courtCount: number;
  roundCount: number;
}): MatchConditionInput {
  const matchupMode = params.matchupMode ?? "standard";

  if (matchupMode !== "standard") {
    const femaleCount = params.femaleCount ?? 0;
    const maleCount = params.maleCount ?? 0;

    if (femaleCount + maleCount !== params.participantCount) {
      throw new Error("男性人数と女性人数の合計を参加人数と一致させてください。");
    }
  }

  return {
    eventName: params.eventName,
    matchupMode,
    participantCount: params.participantCount,
    courtCount: params.courtCount,
    roundCount: params.roundCount,
    participants: Array.from({ length: params.participantCount }, (_, index) => {
      const participant = {
        id: `player-${formatParticipantLabel(index)}`,
        name: formatParticipantLabel(index),
      };

      return matchupMode === "standard"
        ? participant
        : {
            ...participant,
            gender: index < (params.femaleCount ?? 0) ? "female" : "male",
          };
    }),
  };
}

function countResultGenders(result: MatchupResult) {
  return result.conditions.participants.reduce(
    (counts, participant) => {
      if (participant.gender === "female") {
        counts.female += 1;
      } else if (participant.gender === "male") {
        counts.male += 1;
      }

      return counts;
    },
    { female: 0, male: 0 },
  );
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
  url.searchParams.set("mode", result.conditions.matchupMode);

  if (result.conditions.matchupMode !== "standard") {
    const genderCounts = countResultGenders(result);

    url.searchParams.set("female", String(genderCounts.female));
    url.searchParams.set("male", String(genderCounts.male));
  }

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

  const version = params.get("v");
  const parsed =
    version === LEGACY_SHARE_QUERY_VERSION
      ? legacySharedMatchQuerySchema.parse({
          shared: params.get("shared"),
          v: params.get("v"),
          event: params.get("event") ?? undefined,
          participants: params.get("participants"),
          courts: params.get("courts"),
          rounds: params.get("rounds"),
          seed: params.get("seed"),
        })
      : sharedMatchQuerySchema.parse({
          shared: params.get("shared"),
          v: params.get("v"),
          event: params.get("event") ?? undefined,
          participants: params.get("participants"),
          courts: params.get("courts"),
          rounds: params.get("rounds"),
          seed: params.get("seed"),
          mode: params.get("mode") ?? undefined,
          female: params.get("female") ?? undefined,
          male: params.get("male") ?? undefined,
        });

  const input = createAutoMatchConditionInput({
    eventName: parsed.event,
    matchupMode: "mode" in parsed ? parsed.mode : "standard",
    participantCount: parsed.participants,
    femaleCount: "female" in parsed ? parsed.female : undefined,
    maleCount: "male" in parsed ? parsed.male : undefined,
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
