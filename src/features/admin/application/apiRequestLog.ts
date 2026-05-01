import { getAdminDb } from "@/lib/server/firebase";
import type { ApiRequestLogRecord } from "../model/types";
import { toIsoString } from "./firestoreUtils";

export async function listApiRequestLogs(limit = 200): Promise<ApiRequestLogRecord[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("apiRequestLogs")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      accountId: typeof data.accountId === "string" ? data.accountId : undefined,
      courtCount: toOptionalNumber(data.courtCount),
      createdAt: toIsoString(data.createdAt),
      durationMs: toOptionalNumber(data.durationMs),
      endpoint: typeof data.endpoint === "string" ? data.endpoint : "",
      method: typeof data.method === "string" ? data.method : "",
      participantCount: toOptionalNumber(data.participantCount),
      requestId: typeof data.requestId === "string" ? data.requestId : doc.id,
      roundCount: toOptionalNumber(data.roundCount),
      seed: toOptionalNumber(data.seed),
      status: toOptionalNumber(data.status) ?? 0,
    };
  });
}

function toOptionalNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

