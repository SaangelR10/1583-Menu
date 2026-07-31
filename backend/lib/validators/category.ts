import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

// Ver nota en product.ts: no derivar con `.partial()` de un schema con `.default()`.
export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  nameEn: z.string().trim().max(80).optional(),
  isActive: z.boolean().optional(),
});

export const categoryReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(200),
});
