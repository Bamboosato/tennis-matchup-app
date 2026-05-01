import crypto from "node:crypto";

export const ADMIN_SESSION_COOKIE = "tennis_matchup_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSessionPayload = {
  exp: number;
  role: "admin";
};

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!value) {
    throw new Error("Missing required environment variable: ADMIN_SESSION_SECRET");
  }

  return value;
}

function optionalSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

function signPayload(payload: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createAdminSessionCookieValue(now = Date.now()) {
  const payload: AdminSessionPayload = {
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
    role: "admin",
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(body);

  return `${body}.${signature}`;
}

export function verifyAdminSessionCookie(value: string | undefined | null, now = Date.now()) {
  if (!value) {
    return false;
  }

  const [body, signature] = value.split(".");
  const secret = optionalSessionSecret();

  if (!body || !signature || !secret || !safeSignatureEqual(signPayloadWithSecret(body, secret), signature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AdminSessionPayload;

    return payload.role === "admin" && payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

function signPayloadWithSecret(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeSignatureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
