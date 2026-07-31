import { NextRequest, NextResponse } from "next/server";
import { getStoreConfig } from "@/lib/storeConfig";
import { buildStoreInfoPayload } from "@/lib/mappers/storeInfoMapper";
import { corsHeaders } from "@/lib/http";

export const revalidate = 0;

export async function GET(request: NextRequest) {
  const config = await getStoreConfig();
  const payload = buildStoreInfoPayload(config);

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
