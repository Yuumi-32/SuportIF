import { z } from "zod";

import { petActions } from "@/lib/pet/state";

export const petCareSchema = z.object({
  action: z.enum(petActions)
});

export const renamePetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome ao seu pet.")
    .max(20, "Nome muito longo (máximo de 20 caracteres).")
});
