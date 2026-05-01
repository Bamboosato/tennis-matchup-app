import { z } from "zod";
import { matchupModeSchema, participantInputSchema } from "../model/schemas";

const apiMatchConditionSchema = z
  .object({
    eventName: z.string().trim().optional(),
    matchupMode: matchupModeSchema.default("standard"),
    participantCount: z
      .number({ message: "参加人数を入力してください" })
      .int("参加人数は整数で入力してください")
      .min(4, "参加者は4人以上必要です")
      .max(30, "参加人数は30人以下にしてください"),
    participants: z.array(participantInputSchema),
    courtCount: z
      .number({ message: "コート数を入力してください" })
      .int("コート数は整数で入力してください")
      .min(1, "コート数は1以上にしてください")
      .max(8, "コート数は8以下にしてください"),
    roundCount: z
      .number({ message: "実施回数を入力してください" })
      .int("実施回数は整数で入力してください")
      .min(1, "実施回数は1以上にしてください")
      .max(20, "実施回数は20回以下にしてください"),
  })
  .superRefine((value, ctx) => {
    if (value.participants.length !== value.participantCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participants"],
        message: "参加者一覧の件数が参加人数と一致していません",
      });
    }

    if (
      value.matchupMode !== "standard" &&
      value.participants.some((participant) => !participant.gender)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["participants"],
        message: "同性対決優先・混合対決優先では参加者の性別が必要です",
      });
    }
  });

export const generateMatchupApiSchema = apiMatchConditionSchema.extend({
  seed: z.number().int("seedは整数で指定してください").optional(),
});

export const replayMatchupApiSchema = apiMatchConditionSchema.extend({
  seed: z.number({ message: "再現にはseedが必要です" }).int("seedは整数で指定してください"),
});

export type GenerateMatchupApiInput = z.infer<typeof generateMatchupApiSchema>;
export type ReplayMatchupApiInput = z.infer<typeof replayMatchupApiSchema>;

export function zodIssuesToDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path.join(".") || "body",
  }));
}
