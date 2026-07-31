import { z } from "zod";

export const uploadSignSchema = z.object({
  scope: z.enum(["producto", "tienda"]).default("producto"),
});

export const uploadDestroySchema = z.object({
  publicId: z.string().trim().min(1).max(300),
});
