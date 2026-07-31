import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { getOrCreateStoreConfig, STORE_CONFIG_ID } from "@/lib/storeConfig";
import { storeConfigUpdateSchema } from "@/lib/validators/storeConfig";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

/** Los campos Json de Prisma no aceptan `null` crudo: hay que usar el sentinel Prisma.JsonNull. */
function toJsonInput(value: unknown) {
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue | undefined;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const config = await getOrCreateStoreConfig();
  return NextResponse.json({ config });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = storeConfigUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const before = await getOrCreateStoreConfig();
  const config = await prisma.storeConfig.update({
    where: { id: STORE_CONFIG_ID },
    data: {
      ...parsed.data,
      hours: toJsonInput(parsed.data.hours),
      banners: toJsonInput(parsed.data.banners),
    },
  });

  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "storeConfig.update",
    entityType: "StoreConfig",
    entityId: STORE_CONFIG_ID,
    before,
    after: config,
    request,
  });

  return NextResponse.json({ config });
}
