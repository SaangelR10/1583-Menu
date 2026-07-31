import { prisma } from "./prisma";

export const STORE_CONFIG_ID = "singleton";

export async function getStoreConfig() {
  return prisma.storeConfig.findUnique({ where: { id: STORE_CONFIG_ID } });
}

export async function getOrCreateStoreConfig() {
  const existing = await getStoreConfig();
  if (existing) return existing;
  return prisma.storeConfig.create({
    data: {
      id: STORE_CONFIG_ID,
      whatsappNumber: "+573181454142",
      instagramUrl: "https://www.instagram.com/cafe_1583/",
    },
  });
}
