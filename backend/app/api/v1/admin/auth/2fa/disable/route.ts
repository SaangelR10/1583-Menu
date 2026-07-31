import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { z } from "zod";

const disableSchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = disableSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const admin = await prisma.admin.findUnique({ where: { id: auth.admin.adminId } });
  if (!admin) return jsonError(404, "Administrador no encontrado.");

  const valid = await verifyPassword(parsed.data.password, admin.passwordHash);
  if (!valid) return jsonError(401, "Contrasena incorrecta.");

  await prisma.admin.update({
    where: { id: admin.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await writeAuditLog({
    adminId: admin.id,
    action: "admin.2fa_disabled",
    entityType: "Admin",
    entityId: admin.id,
    request,
  });

  return NextResponse.json({ twoFactorEnabled: false });
}
