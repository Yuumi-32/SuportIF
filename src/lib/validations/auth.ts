import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido.").toLowerCase(),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.")
});

export type LoginInput = z.infer<typeof loginSchema>;
