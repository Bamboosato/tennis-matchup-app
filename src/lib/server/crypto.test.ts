import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createApiKeyMaterial,
  hashApiKey,
  parseApiKey,
  verifyPasswordHash,
} from "./crypto";

function createPasswordHash(password: string) {
  const salt = Buffer.from("test-salt");
  const iterations = 1_000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");

  return `pbkdf2:sha256:${iterations}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

describe("server crypto helpers", () => {
  it("verifies the admin PBKDF2 password hash format", async () => {
    const encoded = createPasswordHash("secret-password");

    await expect(verifyPasswordHash("secret-password", encoded)).resolves.toBe(true);
    await expect(verifyPasswordHash("wrong-password", encoded)).resolves.toBe(false);
  });

  it("creates parseable API keys and hashes them deterministically", () => {
    const material = createApiKeyMaterial();
    const parsed = parseApiKey(material.apiKey);

    expect(parsed?.keyId).toBe(material.keyId);
    expect(hashApiKey(material.apiKey)).toBe(material.keyHash);
    expect(material.keyPreview).toContain("****");
  });
});

