import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt";

export async function requireAdmin(
  request: NextRequest
): Promise<{ admin: AccessTokenPayload } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 401 }) };
  }
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: "Sesion invalida o expirada." }, { status: 401 }) };
  }
  return { admin: payload };
}
