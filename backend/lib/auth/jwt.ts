import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export type AccessTokenPayload = {
  adminId: string;
  email: string;
};

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET no esta configurado correctamente (minimo 32 caracteres).");
  }
  return new TextEncoder().encode(secret);
}

export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getAccessSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    if (typeof payload.adminId !== "string" || typeof payload.email !== "string") return null;
    return { adminId: payload.adminId, email: payload.email };
  } catch {
    return null;
  }
}

const CHALLENGE_TTL_SECONDS = 5 * 60;

export type ChallengePayload = {
  adminId: string;
  purpose: "2fa_challenge";
};

/** Token corto emitido tras validar email+password cuando falta el segundo factor (TOTP). */
export async function createChallengeToken(adminId: string): Promise<string> {
  return new SignJWT({ adminId, purpose: "2fa_challenge" } satisfies ChallengePayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
    .sign(getAccessSecret());
}

export async function verifyChallengeToken(token: string): Promise<ChallengePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    if (payload.purpose !== "2fa_challenge" || typeof payload.adminId !== "string") return null;
    return { adminId: payload.adminId, purpose: "2fa_challenge" };
  } catch {
    return null;
  }
}

/** Token opaco aleatorio para el refresh token; el valor crudo solo vive en la cookie del cliente. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
