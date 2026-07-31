import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/http";
import {
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TTL_SECONDS,
} from "./jwt";
import { setRefreshCookie, issueCsrfCookie } from "./cookies";

export async function issueSession(admin: { id: string; email: string }, request: NextRequest) {
  const accessToken = await createAccessToken({ adminId: admin.id, email: admin.email });

  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      adminId: admin.id,
      expiresAt,
      createdByIp: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  });

  await setRefreshCookie(refreshToken);
  const csrfToken = await issueCsrfCookie();

  return {
    accessToken,
    csrfToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    admin: { id: admin.id, email: admin.email },
  };
}
