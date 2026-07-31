import { NextRequest, NextResponse } from "next/server";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function allowedOrigins(): string[] {
  return (process.env.PUBLIC_ORIGIN_ALLOWLIST ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Entradas que empiezan con `*` se tratan como sufijo (no como subdominio con punto,
 * porque Vercel nombra sus alias de deploy como `proyecto-hash-equipo.vercel.app`,
 * todo en una sola etiqueta separada por guiones, no por puntos). Ej:
 * `*-sergios-projects-04bff688.vercel.app` matchea production, git-branch y
 * cualquier preview con hash aleatorio de ese mismo equipo de Vercel, sin tener
 * que actualizar la lista cada vez que se genera un nuevo deploy.
 */
function originMatches(origin: string, entry: string): boolean {
  if (entry.startsWith("*")) return origin.endsWith(entry.slice(1));
  return origin === entry;
}

/** CORS para los endpoints públicos (/api/v1/menu, /api/v1/store-info). */
export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allowlist = allowedOrigins();
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowlist.some((entry) => originMatches(origin, entry))) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return headers;
}

export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin navigation requests carry no Origin header
  const selfOrigin = request.nextUrl.origin;
  return origin === selfOrigin;
}
