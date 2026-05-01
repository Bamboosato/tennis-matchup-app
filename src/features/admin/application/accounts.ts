import { FieldValue } from "firebase-admin/firestore";
import {
  createApiKeyMaterial,
  hashApiKey,
  normalizeAccountName,
  randomHex,
} from "@/lib/server/crypto";
import { getAdminDb } from "@/lib/server/firebase";
import type {
  AdminAccountView,
  ApiAccountRecord,
  ApiKeyRecord,
  ApiScope,
  RateLimitSettings,
} from "../model/types";
import { API_SCOPES } from "../model/types";
import { toIsoString } from "./firestoreUtils";
import { writeAuditLog } from "./auditLog";

export const DEFAULT_RATE_LIMIT: RateLimitSettings = {
  requests: 10,
  windowSeconds: 60,
};

type AccountSettings = {
  contactEmail?: string;
  enabled: boolean;
  rateLimit: RateLimitSettings;
  scopes: ApiScope[];
};

type CreateDraftAccountInput = {
  accountName: string;
  contactEmail?: string;
  requestId: string;
};

type UpdateAccountInput = AccountSettings & {
  accountId: string;
  requestId: string;
};

export function normalizeSettings(input: Partial<AccountSettings>): AccountSettings {
  return {
    contactEmail: input.contactEmail?.trim() || undefined,
    enabled: input.enabled ?? true,
    rateLimit: normalizeRateLimit(input.rateLimit),
    scopes: normalizeScopes(input.scopes),
  };
}

export async function createDraftAccount(input: CreateDraftAccountInput) {
  const db = getAdminDb();
  const normalizedName = normalizeAccountName(input.accountName);

  if (!normalizedName) {
    throw new Error("ACCOUNT_NAME_REQUIRED");
  }

  const accountId = `acc_${randomHex(12)}`;
  const key = createApiKeyMaterial();
  const accountRef = db.collection("apiAccounts").doc(accountId);
  const keyRef = db.collection("apiKeys").doc(key.keyId);
  const indexRef = db.collection("accountNameIndex").doc(normalizedName);
  const settings = normalizeSettings({
    contactEmail: input.contactEmail,
    enabled: false,
    rateLimit: DEFAULT_RATE_LIMIT,
    scopes: [...API_SCOPES],
  });

  await db.runTransaction(async (transaction) => {
    const indexSnapshot = await transaction.get(indexRef);

    if (indexSnapshot.exists) {
      throw new Error("ACCOUNT_NAME_EXISTS");
    }

    transaction.set(accountRef, {
      accountId,
      accountName: input.accountName.trim(),
      accountNameNormalized: normalizedName,
      contactEmail: settings.contactEmail ?? null,
      createdAt: FieldValue.serverTimestamp(),
      currentKeyId: key.keyId,
      deletedAt: null,
      enabled: false,
      rateLimit: settings.rateLimit,
      scopes: settings.scopes,
      status: "draft",
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(keyRef, {
      accountId,
      createdAt: FieldValue.serverTimestamp(),
      enabled: false,
      keyHash: key.keyHash,
      keyId: key.keyId,
      keyPreview: key.keyPreview,
      lastUsedAt: null,
      revokedAt: null,
      rotatedAt: null,
      status: "active",
    });
    transaction.set(indexRef, {
      accountId,
      accountNameNormalized: normalizedName,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await writeAuditLog({
    accountId,
    accountName: input.accountName.trim(),
    actor: "admin",
    message: "Draft account created",
    requestId: input.requestId,
    result: "success",
    type: "account_draft_created",
  });

  const account = await getAccountView(accountId);

  if (!account) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  return {
    account,
    apiKey: key.apiKey,
  };
}

export async function registerAccount(input: UpdateAccountInput) {
  await updateAccountRecord(input, "active");
  await writeAuditLog({
    accountId: input.accountId,
    actor: "admin",
    message: "Account registered",
    requestId: input.requestId,
    result: "success",
    type: "account_registered",
  });

  return getRequiredAccountView(input.accountId);
}

export async function updateAccount(input: UpdateAccountInput) {
  await updateAccountRecord(input);
  await writeAuditLog({
    accountId: input.accountId,
    actor: "admin",
    message: "Account updated",
    requestId: input.requestId,
    result: "success",
    type: "account_updated",
  });

  return getRequiredAccountView(input.accountId);
}

export async function rotateAccountKey(accountId: string, requestId: string) {
  const db = getAdminDb();
  const accountRef = db.collection("apiAccounts").doc(accountId);
  const newKey = createApiKeyMaterial();
  const newKeyRef = db.collection("apiKeys").doc(newKey.keyId);
  let accountName = "";

  await db.runTransaction(async (transaction) => {
    const accountSnapshot = await transaction.get(accountRef);

    if (!accountSnapshot.exists) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const account = accountSnapshot.data() ?? {};
    const currentKeyId = String(account.currentKeyId ?? "");
    accountName = String(account.accountName ?? "");

    if (currentKeyId) {
      transaction.set(
        db.collection("apiKeys").doc(currentKeyId),
        {
          enabled: false,
          revokedAt: FieldValue.serverTimestamp(),
          rotatedAt: FieldValue.serverTimestamp(),
          status: "revoked",
        },
        { merge: true },
      );
    }

    transaction.set(newKeyRef, {
      accountId,
      createdAt: FieldValue.serverTimestamp(),
      enabled: Boolean(account.enabled),
      keyHash: newKey.keyHash,
      keyId: newKey.keyId,
      keyPreview: newKey.keyPreview,
      lastUsedAt: null,
      revokedAt: null,
      rotatedAt: null,
      status: "active",
    });
    transaction.set(
      accountRef,
      {
        currentKeyId: newKey.keyId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  await writeAuditLog({
    accountId,
    accountName,
    actor: "admin",
    message: "API key rotated",
    requestId,
    result: "success",
    type: "api_key_rotated",
  });

  const account = await getRequiredAccountView(accountId);

  return {
    account,
    apiKey: newKey.apiKey,
  };
}

export async function deleteAccount(accountId: string, requestId: string) {
  const db = getAdminDb();
  const accountRef = db.collection("apiAccounts").doc(accountId);
  let accountName = "";

  await db.runTransaction(async (transaction) => {
    const accountSnapshot = await transaction.get(accountRef);

    if (!accountSnapshot.exists) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const account = accountSnapshot.data() ?? {};
    const currentKeyId = String(account.currentKeyId ?? "");
    accountName = String(account.accountName ?? "");

    transaction.set(
      accountRef,
      {
        deletedAt: FieldValue.serverTimestamp(),
        enabled: false,
        status: "deleted",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (currentKeyId) {
      transaction.set(
        db.collection("apiKeys").doc(currentKeyId),
        {
          enabled: false,
          revokedAt: FieldValue.serverTimestamp(),
          status: "revoked",
        },
        { merge: true },
      );
    }
  });

  await writeAuditLog({
    accountId,
    accountName,
    actor: "admin",
    message: "Account deleted",
    requestId,
    result: "success",
    type: "account_deleted",
  });
}

export async function listAccountViews(): Promise<AdminAccountView[]> {
  const db = getAdminDb();
  const snapshot = await db.collection("apiAccounts").orderBy("createdAt", "desc").get();

  const accounts = await Promise.all(snapshot.docs.map((doc) => toAccountView(doc.id, doc.data())));

  return accounts.filter((account) => account.status !== "deleted");
}

export async function getAccountView(accountId: string): Promise<AdminAccountView | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("apiAccounts").doc(accountId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toAccountView(snapshot.id, snapshot.data() ?? {});
}

export async function getApiKeyRecord(keyId: string): Promise<ApiKeyRecord | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("apiKeys").doc(keyId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toApiKeyRecord(snapshot.id, snapshot.data() ?? {});
}

export async function getAccountRecord(accountId: string): Promise<ApiAccountRecord | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("apiAccounts").doc(accountId).get();

  if (!snapshot.exists) {
    return null;
  }

  return toApiAccountRecord(snapshot.id, snapshot.data() ?? {});
}

export async function markApiKeyUsed(keyId: string) {
  const db = getAdminDb();
  await db.collection("apiKeys").doc(keyId).set(
    {
      lastUsedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function updateAccountRecord(input: UpdateAccountInput, nextStatus?: "active") {
  const db = getAdminDb();
  const settings = normalizeSettings(input);
  const accountRef = db.collection("apiAccounts").doc(input.accountId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(accountRef);

    if (!snapshot.exists) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const account = snapshot.data() ?? {};
    const currentKeyId = String(account.currentKeyId ?? "");

    transaction.set(
      accountRef,
      {
        contactEmail: settings.contactEmail ?? null,
        enabled: settings.enabled,
        rateLimit: settings.rateLimit,
        scopes: settings.scopes,
        ...(nextStatus ? { status: nextStatus } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    if (currentKeyId) {
      transaction.set(
        db.collection("apiKeys").doc(currentKeyId),
        {
          enabled: settings.enabled && (nextStatus === "active" || account.status === "active"),
        },
        { merge: true },
      );
    }
  });
}

async function getRequiredAccountView(accountId: string) {
  const account = await getAccountView(accountId);

  if (!account) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  return account;
}

async function toAccountView(accountId: string, data: FirebaseFirestore.DocumentData) {
  const account = toApiAccountRecord(accountId, data);
  const key = await getApiKeyRecord(account.currentKeyId);

  return {
    ...account,
    keyPreview: key?.keyPreview ?? "",
    lastUsedAt: key?.lastUsedAt ?? null,
  };
}

function toApiAccountRecord(accountId: string, data: FirebaseFirestore.DocumentData): ApiAccountRecord {
  return {
    accountId,
    accountName: String(data.accountName ?? ""),
    accountNameNormalized: String(data.accountNameNormalized ?? ""),
    contactEmail: typeof data.contactEmail === "string" ? data.contactEmail : undefined,
    createdAt: toIsoString(data.createdAt),
    currentKeyId: String(data.currentKeyId ?? ""),
    deletedAt: toIsoString(data.deletedAt) ?? null,
    enabled: Boolean(data.enabled),
    rateLimit: normalizeRateLimit(data.rateLimit),
    scopes: normalizeScopes(data.scopes),
    status: data.status === "draft" || data.status === "deleted" ? data.status : "active",
    updatedAt: toIsoString(data.updatedAt),
  };
}

function toApiKeyRecord(keyId: string, data: FirebaseFirestore.DocumentData): ApiKeyRecord {
  return {
    accountId: String(data.accountId ?? ""),
    createdAt: toIsoString(data.createdAt),
    enabled: Boolean(data.enabled),
    keyHash: String(data.keyHash ?? ""),
    keyId,
    keyPreview: String(data.keyPreview ?? ""),
    lastUsedAt: toIsoString(data.lastUsedAt) ?? null,
    revokedAt: toIsoString(data.revokedAt) ?? null,
    rotatedAt: toIsoString(data.rotatedAt) ?? null,
    status: data.status === "revoked" ? "revoked" : "active",
  };
}

function normalizeRateLimit(value: unknown): RateLimitSettings {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_RATE_LIMIT;
  }

  const rateLimit = value as Partial<RateLimitSettings>;
  const requests = Number(rateLimit.requests);
  const windowSeconds = Number(rateLimit.windowSeconds);

  return {
    requests: Number.isInteger(requests) && requests > 0 ? Math.min(requests, 1000) : DEFAULT_RATE_LIMIT.requests,
    windowSeconds:
      Number.isInteger(windowSeconds) && windowSeconds > 0
        ? Math.min(windowSeconds, 3600)
        : DEFAULT_RATE_LIMIT.windowSeconds,
  };
}

function normalizeScopes(value: unknown): ApiScope[] {
  const values = Array.isArray(value) ? value : [];
  const scopes = values.filter((scope): scope is ApiScope =>
    API_SCOPES.includes(scope as ApiScope),
  );

  return scopes.length ? scopes : [...API_SCOPES];
}

export function hashIncomingApiKey(apiKey: string) {
  return hashApiKey(apiKey);
}
