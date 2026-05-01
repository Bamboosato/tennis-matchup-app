import { jsonError, jsonOk } from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/admin-route";
import { createRequestId, readJsonBody } from "@/lib/server/request";
import { normalizeSettings, registerAccount } from "@/features/admin/application/accounts";
import { accountSettingsSchema } from "../../accountSettingsSchema";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const requestId = createRequestId();
  const unauthorized = requireAdminSession(request, requestId);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { accountId } = await params;
    const body = await readJsonBody(request);
    const parsed = accountSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(422, "VALIDATION_ERROR", "入力内容を確認してください。", requestId);
    }

    const account = await registerAccount({
      accountId,
      requestId,
      ...normalizeSettings(parsed.data),
    });

    return jsonOk({ account }, requestId);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError(400, "INVALID_JSON", "JSONとして解析できません。", requestId);
    }

    return jsonError(503, "SERVICE_UNAVAILABLE", "アカウントを登録できません。", requestId);
  }
}

