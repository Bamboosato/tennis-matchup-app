import { jsonError, jsonOk } from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/admin-route";
import { createRequestId } from "@/lib/server/request";
import { listApiRequestLogs } from "@/features/admin/application/apiRequestLog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const unauthorized = requireAdminSession(request, requestId);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const logs = await listApiRequestLogs();

    return jsonOk({ logs }, requestId);
  } catch {
    return jsonError(503, "SERVICE_UNAVAILABLE", "API利用ログを取得できません。", requestId);
  }
}

