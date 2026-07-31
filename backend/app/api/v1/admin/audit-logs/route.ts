import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ("error" in auth) return auth.error;

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { admin: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);

  return NextResponse.json({ logs, total, page, pageSize: PAGE_SIZE });
}
