"use client";

type Session = {
  accessToken: string;
  csrfToken: string;
  admin: { id: string; email: string };
};

let session: Session | null = null;
let refreshPromise: Promise<Session | null> | null = null;

export function getSession(): Session | null {
  return session;
}

export function setSession(next: Session | null) {
  session = next;
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * La cookie CSRF (no-httpOnly) sobrevive a recargas de pagina y a la perdida del estado en
 * memoria, a diferencia de `session.csrfToken`. Leerla directo de document.cookie es lo que
 * permite recuperar la sesion (via refresh) despues de un F5 o al abrir una pestana nueva.
 */
function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)cafe1583_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function refreshSession(): Promise<Session | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch("/api/v1/admin/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": readCsrfCookie() },
    });
    if (!res.ok) {
      session = null;
      return null;
    }
    const data = await parseJsonSafe(res);
    session = data;
    return data;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function logoutSession(): Promise<void> {
  await fetch("/api/v1/admin/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": readCsrfCookie() },
  }).catch(() => null);
  session = null;
}

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const headers = new Headers(options.headers);
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(path, { ...options, headers, credentials: "include" });

  if (res.status === 401 && !isRetry && !path.includes("/auth/refresh") && !path.includes("/auth/login")) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch<T>(path, options, true);
  }

  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new ApiError(res.status, (data as { error?: string })?.error ?? "Error inesperado.", (data as { issues?: unknown })?.issues);
  }

  if (res.status === 204) return undefined as T;
  return (await parseJsonSafe(res)) as T;
}
