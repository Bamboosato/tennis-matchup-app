import { jsonOk } from "@/lib/server/api-response";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/server/admin-session";
import { readCookie } from "@/lib/server/admin-route";
import { createRequestId } from "@/lib/server/request";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const cookieValue = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);

  return jsonOk(
    {
      authenticated: verifyAdminSessionCookie(cookieValue),
    },
    requestId,
  );
}

