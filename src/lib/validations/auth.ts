import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido.").toLowerCase(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email: z.string().email("Informe um e-mail válido.").toLowerCase(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
