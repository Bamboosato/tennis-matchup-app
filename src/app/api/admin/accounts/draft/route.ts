import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/admin-route";
import { createRequestId, readJsonBody } from "@/lib/server/request";
import { createDraftAccount } from "@/features/admin/application/accounts";

export const runtime = "nodejs";

const createDraftSchema = z.object({
  accountName: z.string().trim().min(1, "アカウント名を入力してください"),
  contactEmail: z.string().trim().email("連絡先メールの形式が不正です").optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  const unauthorized = requireAdminSession(request, requestId);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await readJsonBody(request);
    const parsed = createDraftSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(422, "VALIDATION_ERROR", "入力内容を確認してください。", requestId);
    }

    const result = await createDraftAccount({
      accountName: parsed.data.accountName,
      contactEmail: parsed.data.contactEmail || undefined,
      requestId,
    });

    return jsonOk(result, requestId, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError(400, "INVALID_JSON", "JSONとして解析できません。", requestId);
    }

    if (error instanceof Error && error.message === "ACCOUNT_NAME_EXISTS") {
      return jsonError(422, "VALIDATION_ERROR", "同じアカウント名が既に登録されています。", requestId);
    }

    return jsonError(503, "SERVICE_UNAVAILABLE", "アカウントを追加できません。", requestId);
  }
}

