import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMenuPayload } from "@/lib/mappers/menuMapper";
import { corsHeaders } from "@/lib/http";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  const categories = await prisma.category.findMany({
    include: { products: true },
    orderBy: { sortOrder: "asc" },
  });

  const payload = buildMenuPayload(categories);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    },
  });
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
