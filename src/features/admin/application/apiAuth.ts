import { FieldValue } from "firebase-admin/firestore";
import { jsonError, type ApiErrorCode } from "@/lib/server/api-response";
import { hashApiKey, parseApiKey, safeStringEqual } from "@/lib/server/crypto";
import { getAdminDb } from "@/lib/server/firebase";
import type { ApiAccountRecord, ApiScope } from "../model/types";
import { writeAuditLogBestEffort } from "./auditLog";
import { getAccountRecord, getApiKeyRecord, markApiKeyUsed } from "./accounts";

type AuthSuccess = {
  account: ApiAccountRecord;
  keyId: string;
};

type AuthFailure = {
  response: Response;
};

export async function authenticateApiRequest(
  request: Request,
  requiredScope: ApiScope,
  requestId: string,
): Promise<AuthFailure | AuthSuccess> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    await logAuthFailure(requestId, "api_auth_failed", "Missing API key");
    return {
      response: jsonError(401, "UNAUTHORIZED", "APIキーが必要です。", requestId),
    };
  }

  const parsed = parseApiKey(token);

  if (!parsed) {
    await logAuthFailure(requestId, "api_auth_failed", "Invalid API key format");
    return {
      response: jsonError(401, "UNAUTHORIZED", "APIキーが不正です。", requestId),
    };
  }

  const keyRecord = await getApiKeyRecord(parsed.keyId);

  if (
    !keyRecord ||
    !keyRecord.enabled ||
    keyRecord.status !== "active" ||
    !safeStringEqual(hashApiKey(token), keyRecord.keyHash)
  ) {
    await logAuthFailure(requestId, "api_auth_failed", "Invalid API key");
    return {
      response: jsonError(401, "UNAUTHORIZED", "APIキーが不正です。", requestId),
    };
  }

  const account = await getAccountRecord(keyRecord.accountId);

  if (!account || !account.enabled || account.status !== "active") {
    await writeAuditLogBestEffort({
      accountId: keyRecord.accountId,
      actor: "api",
      message: "Disabled or deleted account attempted API access",
      requestId,
      result: "failure",
      type: "api_auth_failed",
    });

    return {
      response: jsonError(401, "UNAUTHORIZED", "APIキーが不正です。", requestId),
    };
  }

  if (!account.scopes.includes(requiredScope)) {
    await writeAuditLogBestEffort({
      accountId: account.accountId,
      accountName: account.accountName,
      actor: "api",
      message: `Missing required scope: ${requiredScope}`,
      requestId,
      result: "failure",
      type: "api_scope_denied",
    });

    return {
      response: jsonError(403, "FORBIDDEN", "このAPIを利用する権限がありません。", requestId),
    };
  }

  const rateLimit = await checkRateLimit(account, requestId);

  if (!rateLimit.allowed) {
    return {
      response: jsonError(429, "RATE_LIMITED", "リクエスト回数の上限を超えました。", requestId),
    };
  }

  await markApiKeyUsed(keyRecord.keyId);

  return {
    account,
    keyId: keyRecord.keyId,
  };
}

export async function logApiRequest(input: {
  account?: ApiAccountRecord;
  courtCount?: number;
  durationMs: number;
  endpoint: string;
  method: string;
  participantCount?: number;
  requestId: string;
  roundCount?: number;
  seed?: number;
  status: number;
}) {
  try {
    const db = getAdminDb();

    await db.collection("apiRequestLogs").doc(input.requestId).set({
      accountId: input.account?.accountId ?? null,
      courtCount: input.courtCount ?? null,
      createdAt: FieldValue.serverTimestamp(),
      durationMs: input.durationMs,
      endpoint: input.endpoint,
      method: input.method,
      participantCount: input.participantCount ?? null,
      requestId: input.requestId,
      roundCount: input.roundCount ?? null,
      seed: input.seed ?? null,
      status: input.status,
    });
  } catch {
    // Request logging is best-effort to avoid masking the API result.
  }
}

async function checkRateLimit(account: ApiAccountRecord, requestId: string) {
  const db = getAdminDb();
  const now = new Date();
  const bucketStartedAt = new Date(
    Math.floor(now.getTime() / (account.rateLimit.windowSeconds * 1000)) *
      account.rateLimit.windowSeconds *
      1000,
  );
  const bucketId = `${account.accountId}_${bucketStartedAt.toISOString()}`;
  const ref = db.collection("apiRateLimits").doc(bucketId);
  let allowed = false;

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const currentCount = snapshot.exists ? Number(snapshot.data()?.count ?? 0) : 0;
    const nextCount = currentCount + 1;

    allowed = nextCount <= account.rateLimit.requests;

    transaction.set(
      ref,
      {
        accountId: account.accountId,
        bucketId,
        count: nextCount,
        createdAt: snapshot.exists ? snapshot.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        requestLimit: account.rateLimit.requests,
        requestId,
        windowSeconds: account.rateLimit.windowSeconds,
        windowStartedAt: bucketStartedAt.toISOString(),
      },
      { merge: true },
    );
  });

  if (!allowed) {
    await writeAuditLogBestEffort({
      accountId: account.accountId,
      accountName: account.accountName,
      actor: "api",
      message: "API rate limit exceeded",
      requestId,
      result: "failure",
      type: "api_rate_limited",
    });
  }

  return {
    allowed,
  };
}

async function logAuthFailure(requestId: string, type: string, message: string) {
  await writeAuditLogBestEffort({
    actor: "api",
    message,
    requestId,
    result: "failure",
    type,
  });
}

export function mapServerErrorToResponse(error: unknown, requestId: string) {
  const code: ApiErrorCode = "SERVICE_UNAVAILABLE";

  return jsonError(
    503,
    code,
    error instanceof Error && error.message.startsWith("Missing required environment variable")
      ? "API設定が不足しています。"
      : "現在APIを利用できません。時間をおいて再試行してください。",
    requestId,
  );
}

