import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { createUploadSignature, CLOUDINARY_FOLDER, CLOUDINARY_STORE_FOLDER } from "@/lib/cloudinary";
import { uploadSignSchema } from "@/lib/validators/uploads";
import { jsonError } from "@/lib/http";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const parsed = uploadSignSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Datos invalidos.", { issues: parsed.error.issues });

  const folder = parsed.data.scope === "tienda" ? CLOUDINARY_STORE_FOLDER : CLOUDINARY_FOLDER;
  const signature = createUploadSignature(folder);

  return NextResponse.json(signature);
}
