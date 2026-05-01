import type { Timestamp } from "firebase-admin/firestore";

export function toIsoString(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (isTimestamp(value)) {
    return value.toDate().toISOString();
  }

  return undefined;
}

function isTimestamp(value: unknown): value is Timestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  );
}

