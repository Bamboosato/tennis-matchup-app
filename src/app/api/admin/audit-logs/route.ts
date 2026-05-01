import { jsonError, jsonOk } from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/admin-route";
import { createRequestId } from "@/lib/server/request";
import { listAuditLogs } from "@/features/admin/application/auditLog";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const unauthorized = requireAdminSession(request, requestId);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const logs = await listAuditLogs();

    return jsonOk({ logs }, requestId);
  } catch {
    return jsonError(503, "SERVICE_UNAVAILABLE", "監査ログを取得できません。", requestId);
  }
}

