import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const admin = await prisma.admin.findUnique({
    where: { id: auth.admin.adminId },
    select: { id: true, email: true, twoFactorEnabled: true, createdAt: true },
  });
  if (!admin) return jsonError(404, "Administrador no encontrado.");

  return NextResponse.json({ admin });
}
