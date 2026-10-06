import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// This test must never reach a real project or use application credentials.
assert.match(process.env.FIRESTORE_EMULATOR_HOST || "", /^(127\.0\.0\.1|localhost):\d+$/);
const app = initializeApp({ projectId: "demo-tennis-matchup-security" }, "security-smoke");
const db = getFirestore(app);
const ref = db.collection("security-smoke").doc("sdk-check");
let unsubscribe;
let timer;
try {
  await ref.set({ name: "検証アカウント", count: 0, createdAt: FieldValue.serverTimestamp() });
  const initial = await ref.get();
  assert.equal(initial.data().name, "検証アカウント");
  assert.equal(typeof initial.data().createdAt.toMillis(), "number");
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    transaction.update(ref, { count: snapshot.data().count + 1 });
  });
  assert.equal((await ref.get()).data().count, 1);
  assert.equal((await db.collection("security-smoke").where("count", "==", 1).get()).size, 1);
  const observed = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error("Firestore snapshot timed out")), 10_000);
    unsubscribe = ref.onSnapshot(snapshot => {
      if (snapshot.data()?.name === "購読確認") resolve();
    }, reject);
  });
  try {
    await Promise.all([observed, ref.update({ name: "購読確認" })]);
  } finally {
    clearTimeout(timer);
    unsubscribe?.();
  }
  const batch = db.batch();
  batch.delete(ref);
  await batch.commit();
  assert.equal((await ref.get()).exists, false);
  console.log("PASS: Firebase Admin Firestore create/read/update/query/transaction/timestamp/snapshot/delete using an isolated emulator");
} finally {
  clearTimeout(timer);
  unsubscribe?.();
  await db.terminate();
  await deleteApp(app);
}
