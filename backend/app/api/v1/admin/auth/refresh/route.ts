import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAccessToken, generateRefreshToken, hashRefreshToken, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "@/lib/auth/jwt";
import { getRefreshCookie, setRefreshCookie, clearRefreshCookie, issueCsrfCookie } from "@/lib/auth/cookies";
import { verifyCsrf } from "@/lib/csrf";
import { getClientIp, jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return jsonError(403, "Verificacion CSRF invalida.");
  }

  const rawToken = await getRefreshCookie();
  if (!rawToken) return jsonError(401, "No hay sesion activa.");

  const tokenHash = hashRefreshToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });

  if (!stored) {
    await clearRefreshCookie();
    return jsonError(401, "Sesion invalida.");
  }

  if (stored.revokedAt) {
    // Reuso de un refresh token ya rotado: posible robo — se revoca toda la cadena de la cuenta.
    await prisma.refreshToken.updateMany({
      where: { adminId: stored.adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await clearRefreshCookie();
    return jsonError(401, "Sesion invalida, vuelve a iniciar sesion.");
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    await clearRefreshCookie();
    return jsonError(401, "La sesion expiro, vuelve a iniciar sesion.");
  }

  const newRawToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRawToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const newToken = await prisma.refreshToken.create({
    data: {
      tokenHash: newTokenHash,
      adminId: stored.adminId,
      expiresAt: newExpiresAt,
      createdByIp: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  });

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedByTokenId: newToken.id },
  });

  await setRefreshCookie(newRawToken);
  const csrfToken = await issueCsrfCookie();

  const accessToken = await createAccessToken({ adminId: stored.admin.id, email: stored.admin.email });

  return NextResponse.json({
    accessToken,
    csrfToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    admin: { id: stored.admin.id, email: stored.admin.email },
  });
}
