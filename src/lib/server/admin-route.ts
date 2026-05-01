import { jsonError } from "./api-response";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "./admin-session";

export function requireAdminSession(request: Request, requestId: string) {
  const cookieValue = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);

  if (verifyAdminSessionCookie(cookieValue)) {
    return null;
  }

  return jsonError(401, "UNAUTHORIZED", "管理者ログインが必要です。", requestId);
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

