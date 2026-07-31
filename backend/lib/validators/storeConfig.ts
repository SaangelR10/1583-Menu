import { z } from "zod";

export const storeConfigSchema = z.object({
  whatsappNumber: z.string().trim().max(30).optional().default(""),
  instagramUrl: z.string().trim().max(300).optional().default(""),
  hours: z.record(z.string(), z.string().max(100)).optional().nullable(),
  address: z.string().trim().max(300).optional().default(""),
  dailyMessage: z.string().trim().max(500).optional().default(""),
  aboutText: z.string().trim().max(4000).optional().default(""),
  banners: z
    .array(z.object({ imageUrl: z.string().max(1000), imagePublicId: z.string().max(300).optional() }))
    .max(20)
    .optional()
    .nullable(),
});

// Ver nota en product.ts: no derivar con `.partial()` de un schema con `.default()`.
export const storeConfigUpdateSchema = z.object({
  whatsappNumber: z.string().trim().max(30).optional(),
  instagramUrl: z.string().trim().max(300).optional(),
  hours: z.record(z.string(), z.string().max(100)).optional().nullable(),
  address: z.string().trim().max(300).optional(),
  dailyMessage: z.string().trim().max(500).optional(),
  aboutText: z.string().trim().max(4000).optional(),
  banners: z
    .array(z.object({ imageUrl: z.string().max(1000), imagePublicId: z.string().max(300).optional() }))
    .max(20)
    .optional()
    .nullable(),
});
