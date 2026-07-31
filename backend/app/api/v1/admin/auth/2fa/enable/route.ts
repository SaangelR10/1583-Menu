import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { decryptSecret, verifyTwoFactorToken } from "@/lib/auth/twoFactor";
import { twoFactorEnableSchema } from "@/lib/validators/auth";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = twoFactorEnableSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const admin = await prisma.admin.findUnique({ where: { id: auth.admin.adminId } });
  if (!admin?.twoFactorSecret) {
    return jsonError(400, "Primero genera un secreto con /2fa/setup.");
  }

  const secret = decryptSecret(admin.twoFactorSecret);
  if (!verifyTwoFactorToken(secret, parsed.data.code)) {
    return jsonError(401, "Codigo incorrecto.");
  }

  await prisma.admin.update({ where: { id: admin.id }, data: { twoFactorEnabled: true } });
  await writeAuditLog({
    adminId: admin.id,
    action: "admin.2fa_enabled",
    entityType: "Admin",
    entityId: admin.id,
    request,
  });

  return NextResponse.json({ twoFactorEnabled: true });
}
