import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validators/auth";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const admin = await prisma.admin.findUnique({ where: { id: auth.admin.adminId } });
  if (!admin) return jsonError(404, "Administrador no encontrado.");

  const valid = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
  if (!valid) return jsonError(401, "Contrasena actual incorrecta.");

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });

  // Revoca todas las sesiones activas al cambiar la contrasena.
  await prisma.refreshToken.updateMany({
    where: { adminId: admin.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    adminId: admin.id,
    action: "admin.password_changed",
    entityType: "Admin",
    entityId: admin.id,
    request,
  });

  return NextResponse.json({ ok: true });
}
