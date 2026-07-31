import { z } from "zod";

export const productSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(150),
  nameEn: z.string().trim().max(150).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  additions: z.string().trim().max(500).optional().default(""),
  price: z.number().int().min(0).max(100_000_000).nullable().optional(),
  imageUrl: z.string().trim().max(1000).optional().default(""),
  imagePublicId: z.string().trim().max(300).nullable().optional(),
  inStock: z.boolean().optional().default(true),
});

// OJO: no se deriva con `productSchema.partial()` — Zod aplica `.default()` a cualquier
// campo ausente aunque el schema sea parcial, lo que borraria a "" cada campo no enviado
// en un PATCH. Aqui todos los campos son `.optional()` SIN default, para que un campo
// ausente quede `undefined` y Prisma lo interprete como "no tocar este campo".
export const productUpdateSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(150).optional(),
  nameEn: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  additions: z.string().trim().max(500).optional(),
  price: z.number().int().min(0).max(100_000_000).nullable().optional(),
  imageUrl: z.string().trim().max(1000).optional(),
  imagePublicId: z.string().trim().max(300).nullable().optional(),
  inStock: z.boolean().optional(),
});

export const productReorderSchema = z.object({
  categoryId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1).max(500),
});
