import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { hashGuardId } from "@/lib/server/crypto";
import { getAdminDb } from "@/lib/server/firebase";

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export async function getLoginLockState(ipAddress: string) {
  const db = getAdminDb();
  const guardId = guardDocumentId(ipAddress);
  const snapshot = await db.collection("adminLoginGuards").doc(guardId).get();

  if (!snapshot.exists) {
    return {
      guardId,
      locked: false,
    };
  }

  const data = snapshot.data() ?? {};
  const lockedUntil = data.lockedUntil instanceof Timestamp ? data.lockedUntil.toDate() : null;

  return {
    guardId,
    locked: Boolean(lockedUntil && lockedUntil.getTime() > Date.now()),
  };
}

export async function recordLoginFailure(ipAddress: string) {
  const db = getAdminDb();
  const guardId = guardDocumentId(ipAddress);
  const ref = db.collection("adminLoginGuards").doc(guardId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() ?? {} : {};
    const failureCount = Number(current.failureCount ?? 0) + 1;
    const lockedUntil =
      failureCount >= LOGIN_FAILURE_LIMIT
        ? Timestamp.fromDate(new Date(Date.now() + LOGIN_LOCK_MS))
        : null;

    transaction.set(
      ref,
      {
        failureCount,
        guardId,
        ipHash: guardId,
        lastFailureAt: FieldValue.serverTimestamp(),
        ...(lockedUntil ? { lockedUntil } : {}),
      },
      { merge: true },
    );
  });
}

export async function clearLoginFailures(ipAddress: string) {
  const db = getAdminDb();
  await db.collection("adminLoginGuards").doc(guardDocumentId(ipAddress)).delete();
}

function guardDocumentId(ipAddress: string) {
  return hashGuardId(ipAddress || "unknown");
}

