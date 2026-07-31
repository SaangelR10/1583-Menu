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

/** CORS para los endpoints públicos (/api/v1/menu, /api/v1/store-info). */
export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const allowlist = allowedOrigins();
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowlist.includes(origin)) {
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
