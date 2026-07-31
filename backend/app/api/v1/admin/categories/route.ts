import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators/category";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const maxOrder = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const category = await prisma.category.create({
    data: { ...parsed.data, sortOrder },
  });

  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "category.create",
    entityType: "Category",
    entityId: category.id,
    after: category,
    request,
  });

  return NextResponse.json({ category }, { status: 201 });
}
