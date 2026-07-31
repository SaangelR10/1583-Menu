import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { destroyImage } from "@/lib/cloudinary";
import { uploadDestroySchema } from "@/lib/validators/uploads";
import { writeAuditLog } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = uploadDestroySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  await destroyImage(parsed.data.publicId);
  await writeAuditLog({
    adminId: auth.admin.adminId,
    action: "upload.destroy",
    entityType: "CloudinaryAsset",
    entityId: parsed.data.publicId,
    request,
  });

  return NextResponse.json({ ok: true });
}
