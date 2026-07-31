import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validators/product";
import { slugify, uniqueSlug } from "@/lib/slug";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;
  const products = await prisma.product.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const category = await prisma.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return jsonError(404, "Categoria no encontrada.");

  const existingSlugs = new Set((await prisma.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const baseSlug = slugify(`${category.name}-${parsed.data.name}`);
  const slug = uniqueSlug(baseSlug, existingSlugs);

  const maxOrder = await prisma.product.aggregate({
    where: { categoryId: category.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const product = await prisma.product.create({
    data: { ...parsed.data, slug, sortOrder },
  });

  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "product.create",
    entityType: "Product",
    entityId: product.id,
    after: product,
    request,
  });

  return NextResponse.json({ product }, { status: 201 });
}
