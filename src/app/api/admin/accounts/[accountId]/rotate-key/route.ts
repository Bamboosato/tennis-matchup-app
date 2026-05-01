import { jsonError, jsonOk } from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/admin-route";
import { createRequestId } from "@/lib/server/request";
import { rotateAccountKey } from "@/features/admin/application/accounts";

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
    const result = await rotateAccountKey(accountId, requestId);

    return jsonOk(result, requestId);
  } catch {
    return jsonError(503, "SERVICE_UNAVAILABLE", "APIキーを再発行できません。", requestId);
  }
}

