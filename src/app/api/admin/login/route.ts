import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/api-response";
import {
  adminSessionCookieOptions,
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookieValue,
} from "@/lib/server/admin-session";
import { verifyPasswordHash } from "@/lib/server/crypto";
import { createRequestId, getClientIp, readJsonBody } from "@/lib/server/request";
import { writeAuditLogBestEffort } from "@/features/admin/application/auditLog";
import {
  clearLoginFailures,
  getLoginLockState,
  recordLoginFailure,
} from "@/features/admin/application/loginGuard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const clientIp = getClientIp(request);

  try {
    const lockState = await getLoginLockState(clientIp);

    if (lockState.locked) {
      await writeAuditLogBestEffort({
        actor: "admin",
        message: "Admin login blocked by lock",
        requestId,
        result: "failure",
        type: "login_failure",
      });

      return jsonError(
        429,
        "RATE_LIMITED",
        "ログイン試行回数が多すぎます。時間をおいて再試行してください。",
        requestId,
      );
    }

    const body = await readJsonBody(request);
    const password =
      typeof body === "object" && body !== null && "password" in body
        ? String((body as { password?: unknown }).password ?? "")
        : "";
    const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

    if (!passwordHash) {
      return jsonError(503, "SERVICE_UNAVAILABLE", "管理者認証の設定が不足しています。", requestId);
    }

    const valid = await verifyPasswordHash(password, passwordHash);

    if (!valid) {
      await recordLoginFailure(clientIp);
      await writeAuditLogBestEffort({
        actor: "admin",
        message: "Admin login failed",
        requestId,
        result: "failure",
        type: "login_failure",
      });

      return jsonError(401, "UNAUTHORIZED", "パスワードが正しくありません。", requestId);
    }

    await clearLoginFailures(clientIp);
    await writeAuditLogBestEffort({
      actor: "admin",
      message: "Admin login succeeded",
      requestId,
      result: "success",
      type: "login_success",
    });

    const response = NextResponse.json({
      data: {
        authenticated: true,
      },
      meta: {
        requestId,
      },
    });

    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionCookieValue(),
      adminSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError(400, "INVALID_JSON", "JSONとして解析できません。", requestId);
    }

    console.error("[admin-login] failed", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });

    return jsonError(503, "SERVICE_UNAVAILABLE", "管理者認証を利用できません。", requestId);
  }
}
