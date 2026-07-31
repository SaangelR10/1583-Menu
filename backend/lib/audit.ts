import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { getClientIp } from "./http";

export async function writeAuditLog(params: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  request: NextRequest;
}) {
  const { adminId, action, entityType, entityId, before, after, request } = params;
  await prisma.auditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId: entityId ?? null,
      before: before === undefined ? undefined : (before as object),
      after: after === undefined ? undefined : (after as object),
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  });
}
