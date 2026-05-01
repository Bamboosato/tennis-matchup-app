import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookieOptions,
} from "@/lib/server/admin-session";
import { createRequestId } from "@/lib/server/request";

export const runtime = "nodejs";

export async function POST() {
  const requestId = createRequestId();
  const response = NextResponse.json({
    data: {
      authenticated: false,
    },
    meta: {
      requestId,
    },
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, "", clearAdminSessionCookieOptions());

  return response;
}

