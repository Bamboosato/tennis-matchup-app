import { z } from "zod";
import { API_SCOPES } from "@/features/admin/model/types";

export const accountSettingsSchema = z.object({
  contactEmail: z.string().trim().email("連絡先メールの形式が不正です").optional().or(z.literal("")),
  enabled: z.boolean(),
  rateLimit: z.object({
    requests: z
      .number({ message: "rate limitを入力してください" })
      .int("rate limitは整数で入力してください")
      .min(1, "rate limitは1以上にしてください")
      .max(1000, "rate limitは1000以下にしてください"),
    windowSeconds: z.literal(60),
  }),
  scopes: z.array(z.enum(API_SCOPES)).min(1, "scopeを1つ以上選択してください"),
});

