import crypto from "node:crypto";

const API_KEY_SECRET_BYTES = 32;

export function randomHex(bytes = 12) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function createApiKeyMaterial() {
  const keyId = `key_${randomHex(12)}`;
  const secret = crypto.randomBytes(API_KEY_SECRET_BYTES).toString("base64url");
  const apiKey = `tm_live_${keyId}_${secret}`;
  const keyHash = hashApiKey(apiKey);
  const keyPreview = `tm_live_${keyId}_****${apiKey.slice(-4)}`;

  return {
    apiKey,
    keyHash,
    keyId,
    keyPreview,
  };
}

export function parseApiKey(apiKey: string) {
  const match = /^tm_live_(key_[a-f0-9]{24})_(.+)$/.exec(apiKey);

  if (!match) {
    return null;
  }

  return {
    keyId: match[1],
  };
}

export function hashApiKey(apiKey: string) {
  return `sha256:${crypto.createHash("sha256").update(apiKey).digest("hex")}`;
}

export function safeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeAccountName(accountName: string) {
  return accountName.trim().toLowerCase();
}

export function hashGuardId(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function verifyPasswordHash(password: string, encodedHash: string) {
  const parts = encodedHash.split(":");

  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") {
    return false;
  }

  const iterations = Number(parts[2]);
  const salt = Buffer.from(parts[3], "base64");
  const expected = Buffer.from(parts[4], "base64");

  if (!Number.isInteger(iterations) || iterations <= 0 || !salt.length || !expected.length) {
    return false;
  }

  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, expected.length, "sha256", (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });

  return safeStringEqual(derived.toString("base64"), expected.toString("base64"));
}

