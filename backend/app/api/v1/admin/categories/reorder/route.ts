import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { categoryReorderSchema } from "@/lib/validators/category";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = categoryReorderSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  await prisma.$transaction(
    parsed.data.orderedIds.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "category.reorder",
    entityType: "Category",
    after: { orderedIds: parsed.data.orderedIds },
    request,
  });

  return NextResponse.json({ ok: true });
}
