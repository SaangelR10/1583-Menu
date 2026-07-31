import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validators/product";
import { destroyImage } from "@/lib/cloudinary";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return jsonError(404, "Producto no encontrado.");

  if (parsed.data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
    if (!category) return jsonError(404, "Categoria no encontrada.");
  }

  // Si se reemplaza la imagen y habia una anterior gestionada por Cloudinary, se borra la vieja.
  if (
    parsed.data.imagePublicId !== undefined &&
    before.imagePublicId &&
    before.imagePublicId !== parsed.data.imagePublicId
  ) {
    await destroyImage(before.imagePublicId);
  }

  const product = await prisma.product.update({ where: { id }, data: parsed.data });

  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "product.update",
    entityType: "Product",
    entityId: id,
    before,
    after: product,
    request,
  });

  return NextResponse.json({ product });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return jsonError(404, "Producto no encontrado.");

  if (product.imagePublicId) {
    await destroyImage(product.imagePublicId);
  }

  await prisma.product.delete({ where: { id } });
  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "product.delete",
    entityType: "Product",
    entityId: id,
    before: product,
    request,
  });

  return new NextResponse(null, { status: 204 });
}
