import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/server/firebase";
import { randomHex } from "@/lib/server/crypto";
import type { AuditLogRecord } from "../model/types";
import { toIsoString } from "./firestoreUtils";

type AuditLogInput = Omit<AuditLogRecord, "createdAt" | "logId">;

export async function writeAuditLog(input: AuditLogInput) {
  const db = getAdminDb();
  const logId = `log_${randomHex(12)}`;

  await db.collection("auditLogs").doc(logId).set({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
    logId,
  });

  return logId;
}

export async function listAuditLogs(limit = 200): Promise<AuditLogRecord[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("auditLogs")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      accountId: typeof data.accountId === "string" ? data.accountId : undefined,
      accountName: typeof data.accountName === "string" ? data.accountName : undefined,
      actor: data.actor === "api" ? "api" : "admin",
      createdAt: toIsoString(data.createdAt),
      logId: typeof data.logId === "string" ? data.logId : doc.id,
      message: typeof data.message === "string" ? data.message : "",
      requestId: typeof data.requestId === "string" ? data.requestId : "",
      result: data.result === "failure" ? "failure" : "success",
      type: typeof data.type === "string" ? data.type : "unknown",
    };
  });
}

export async function writeAuditLogBestEffort(input: AuditLogInput) {
  try {
    await writeAuditLog(input);
  } catch {
    // Audit logging must not hide the primary API response.
  }
}

