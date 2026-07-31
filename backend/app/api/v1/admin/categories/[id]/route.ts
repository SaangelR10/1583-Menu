import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { categoryUpdateSchema } from "@/lib/validators/category";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) return jsonError(404, "Categoria no encontrada.");

  const category = await prisma.category.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "category.update",
    entityType: "Category",
    entityId: id,
    before,
    after: category,
    request,
  });

  return NextResponse.json({ category });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return jsonError(404, "Categoria no encontrada.");
  if (category._count.products > 0) {
    return jsonError(409, "No se puede eliminar una categoria con productos. Muevelos o borralos primero.");
  }

  await prisma.category.delete({ where: { id } });
  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "category.delete",
    entityType: "Category",
    entityId: id,
    before: category,
    request,
  });

  return new NextResponse(null, { status: 204 });
}
