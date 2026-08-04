import { z } from "zod";

export const submitSimulationSchema = z.object({
  simulationId: z.string().min(1, "Simulado inválido."),
  answers: z
    .array(
      z.object({
        exerciseId: z.string().min(1, "Questão inválida."),
        selectedOptionId: z.string().min(1, "Responda todas as questões antes de enviar.")
      })
    )
    .min(1, "Envio vazio. Responda pelo menos uma questão.")
});

export type SubmitSimulationInput = z.infer<typeof submitSimulationSchema>;
