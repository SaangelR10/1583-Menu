import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { REFRESH_TOKEN_TTL_SECONDS } from "./jwt";

export const REFRESH_COOKIE = "cafe1583_refresh";
export const CSRF_COOKIE = "cafe1583_csrf";

const isProd = process.env.NODE_ENV === "production";

export async function setRefreshCookie(token: string) {
  const store = await cookies();
  store.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export async function clearRefreshCookie() {
  const store = await cookies();
  store.delete({ name: REFRESH_COOKIE, path: "/" });
}

export async function getRefreshCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

/** Doble-submit CSRF token: cookie legible por JS + header que el cliente debe repetir. */
export async function issueCsrfCookie(): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const store = await cookies();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
  return token;
}

export async function getCsrfCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value;
}
