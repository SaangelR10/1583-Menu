import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export const verifyTwoFactorSchema = z.object({
  challengeToken: z.string().min(10).max(500),
  code: z.string().trim().regex(/^\d{6}$/, "El codigo debe tener 6 digitos."),
});

export const twoFactorEnableSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "El codigo debe tener 6 digitos."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});
