export const API_SCOPES = ["matchups:generate", "matchups:replay"] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export type ApiAccountStatus = "active" | "deleted" | "draft";

export type ApiKeyStatus = "active" | "revoked";

export type RateLimitSettings = {
  requests: number;
  windowSeconds: number;
};

export type ApiAccountRecord = {
  accountId: string;
  accountName: string;
  accountNameNormalized: string;
  contactEmail?: string;
  createdAt?: string;
  currentKeyId: string;
  deletedAt?: string | null;
  enabled: boolean;
  rateLimit: RateLimitSettings;
  scopes: ApiScope[];
  status: ApiAccountStatus;
  updatedAt?: string;
};

export type ApiKeyRecord = {
  accountId: string;
  createdAt?: string;
  enabled: boolean;
  keyHash: string;
  keyId: string;
  keyPreview: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  rotatedAt?: string | null;
  status: ApiKeyStatus;
};

export type AdminAccountView = ApiAccountRecord & {
  keyPreview: string;
  lastUsedAt?: string | null;
};

export type AuditLogRecord = {
  accountId?: string;
  accountName?: string;
  actor: "admin" | "api";
  createdAt?: string;
  logId: string;
  message: string;
  requestId: string;
  result: "failure" | "success";
  type: string;
};

export type ApiRequestLogRecord = {
  accountId?: string;
  courtCount?: number;
  createdAt?: string;
  durationMs?: number;
  endpoint: string;
  method: string;
  participantCount?: number;
  requestId: string;
  roundCount?: number;
  seed?: number;
  status: number;
};

