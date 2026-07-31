import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { generateTwoFactorSecret, buildOtpAuthUrl, encryptSecret } from "@/lib/auth/twoFactor";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const secret = generateTwoFactorSecret();
  const otpAuthUrl = buildOtpAuthUrl(auth.admin.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl);

  await prisma.admin.update({
    where: { id: auth.admin.adminId },
    data: { twoFactorSecret: encryptSecret(secret), twoFactorEnabled: false },
  });

  return NextResponse.json({ secret, otpAuthUrl, qrDataUrl });
}
