import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashRefreshToken } from "@/lib/auth/jwt";
import { getRefreshCookie, clearRefreshCookie } from "@/lib/auth/cookies";
import { verifyCsrf } from "@/lib/csrf";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return jsonError(403, "Verificacion CSRF invalida.");
  }

  const rawToken = await getRefreshCookie();
  if (rawToken) {
    const tokenHash = hashRefreshToken(rawToken);
    await prisma.refreshToken
      .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
      .catch(() => null);
  }

  await clearRefreshCookie();
  return new NextResponse(null, { status: 204 });
}
