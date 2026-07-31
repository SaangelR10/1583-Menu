import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createChallengeToken } from "@/lib/auth/jwt";
import { issueSession } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rateLimit";
import { loginSchema } from "@/lib/validators/auth";
import { getClientIp, jsonError } from "@/lib/http";

const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;
const ACCOUNT_LOCK_THRESHOLD = 5;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitKey = `login:${ip}`;

  const rate = checkRateLimit(rateLimitKey);
  if (!rate.allowed) {
    return jsonError(429, "Demasiados intentos. Intenta de nuevo mas tarde.", {
      retryAfterSeconds: rate.retryAfterSeconds,
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });
  }
  const { email, password } = parsed.data;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    recordFailedAttempt(rateLimitKey);
    return jsonError(401, "Credenciales invalidas.");
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    return jsonError(429, "Cuenta bloqueada temporalmente por intentos fallidos.", {
      lockedUntil: admin.lockedUntil.toISOString(),
    });
  }

  const validPassword = await verifyPassword(password, admin.passwordHash);
  if (!validPassword) {
    recordFailedAttempt(rateLimitKey);
    const failedAttempts = admin.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= ACCOUNT_LOCK_THRESHOLD ? new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS) : null;
    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedAttempts, lockedUntil },
    });
    return jsonError(401, "Credenciales invalidas.");
  }

  resetRateLimit(rateLimitKey);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  if (admin.twoFactorEnabled) {
    const challengeToken = await createChallengeToken(admin.id);
    return NextResponse.json({ twoFactorRequired: true, challengeToken });
  }

  const session = await issueSession(admin, request);
  return NextResponse.json({ twoFactorRequired: false, ...session });
}
