import { z } from "zod";

import { explanationModeValues } from "@/lib/learning/explanation-modes";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "O nome precisa ter pelo menos 3 caracteres.")
    .max(80, "Nome muito longo."),
  bio: z.string().trim().max(280, "A bio pode ter no máximo 280 caracteres.")
});

export const updatePreferencesSchema = z.object({
  preferredExplanationMode: z.enum(explanationModeValues, {
    errorMap: () => ({ message: "Modo de explicação inválido." })
  })
});

// O bcrypt ignora o que passa de 72 bytes, então limitamos a senha nesse ponto.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z
      .string()
      .min(8, "A nova senha precisa ter pelo menos 8 caracteres.")
      .max(72, "A nova senha pode ter no máximo 72 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha.")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação não confere com a nova senha.",
    path: ["confirmPassword"]
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha precisa ser diferente da atual.",
    path: ["newPassword"]
  });
