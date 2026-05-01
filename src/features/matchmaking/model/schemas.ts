import { z } from "zod";

export const matchupModeSchema = z.enum([
  "standard",
  "sameGenderPriority",
  "mixedDoublesPriority",
]);

export const participantGenderSchema = z.enum(["female", "male"]);

export const participantInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "参加者名を入力してください"),
  gender: participantGenderSchema.optional(),
});

export const matchConditionInputSchema = z
  .object({
    eventName: z.string().trim().optional(),
    matchupMode: matchupModeSchema.default("standard"),
    participantCount: z
      .number({ message: "参加人数を入力してください" })
      .int("参加人数は整数で入力してください")
      .min(4, "参加者は4人以上必要です"),
    participants: z.array(participantInputSchema),
    courtCount: z
      .number({ message: "コート数を入力してください" })
      .int("コート数は整数で入力してください")
      .min(1, "コート数は1以上にしてください"),
    roundCount: z
      .number({ message: "実施回数を入力してください" })
      .int("実施回数は整数で入力してください")
      .min(1, "実施回数は1以上にしてください"),
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

export type MatchConditionInputSchema = z.infer<typeof matchConditionInputSchema>;
