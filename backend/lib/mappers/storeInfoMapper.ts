import type { StoreConfig } from "@/app/generated/prisma/client";

export type PublicStoreInfo = {
  whatsappNumber: string;
  instagramUrl: string;
  hours: Record<string, string> | null;
  address: string;
  dailyMessage: string;
  aboutText: string;
  banners: Array<{ imageUrl: string }> | null;
};

export function buildStoreInfoPayload(config: StoreConfig | null): PublicStoreInfo {
  return {
    whatsappNumber: config?.whatsappNumber ?? "",
    instagramUrl: config?.instagramUrl ?? "",
    hours: (config?.hours as Record<string, string> | null) ?? null,
    address: config?.address ?? "",
    dailyMessage: config?.dailyMessage ?? "",
    aboutText: config?.aboutText ?? "",
    banners: (config?.banners as Array<{ imageUrl: string }> | null) ?? null,
  };
}
