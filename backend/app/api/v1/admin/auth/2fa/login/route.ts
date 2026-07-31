import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyChallengeToken } from "@/lib/auth/jwt";
import { decryptSecret, verifyTwoFactorToken } from "@/lib/auth/twoFactor";
import { issueSession } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rateLimit";
import { verifyTwoFactorSchema } from "@/lib/validators/auth";
import { getClientIp, jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitKey = `2fa:${ip}`;
  const rate = checkRateLimit(rateLimitKey);
  if (!rate.allowed) {
    return jsonError(429, "Demasiados intentos. Intenta de nuevo mas tarde.", {
      retryAfterSeconds: rate.retryAfterSeconds,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyTwoFactorSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const challenge = await verifyChallengeToken(parsed.data.challengeToken);
  if (!challenge) {
    recordFailedAttempt(rateLimitKey);
    return jsonError(401, "El desafio 2FA expiro, inicia sesion de nuevo.");
  }

  const admin = await prisma.admin.findUnique({ where: { id: challenge.adminId } });
  if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
    return jsonError(401, "2FA no esta configurado para esta cuenta.");
  }

  const secret = decryptSecret(admin.twoFactorSecret);
  const valid = verifyTwoFactorToken(secret, parsed.data.code);
  if (!valid) {
    recordFailedAttempt(rateLimitKey);
    return jsonError(401, "Codigo incorrecto.");
  }

  const session = await issueSession(admin, request);
  return NextResponse.json(session);
}
