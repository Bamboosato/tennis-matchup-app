import { jsonOk } from "@/lib/server/api-response";
import { requireAdminSession } from "@/lib/server/admin-route";
import { createRequestId } from "@/lib/server/request";
import { listAccountViews } from "@/features/admin/application/accounts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const unauthorized = requireAdminSession(request, requestId);

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const accounts = await listAccountViews();

    return jsonOk({ accounts }, requestId);
  } catch {
    return Response.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "アカウント一覧を取得できません。",
        },
        meta: { requestId },
      },
      { status: 503 },
    );
  }
}

