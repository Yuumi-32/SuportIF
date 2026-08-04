import { z } from "zod";

export const calendarEventTypes = ["COMPROMISSO", "EVENTO", "REVISAO"] as const;

export const createCalendarEventSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(120, "Título muito longo."),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Hora inválida.")
    .optional()
    .or(z.literal("")),
  type: z.enum(calendarEventTypes)
});

export const deleteCalendarEventSchema = z.object({
  id: z.string().min(1, "Evento inválido.")
});

export const noteColors = ["yellow", "green", "blue", "pink"] as const;

export const saveStudyNoteSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().max(80, "Título muito longo.").optional(),
  content: z.string().max(10_000, "Nota muito longa.").optional(),
  folder: z.string().trim().max(40, "Nome de pasta muito longo.").optional(),
  color: z.enum(noteColors).optional()
});

export const deleteStudyNoteSchema = z.object({
  id: z.string().min(1, "Nota inválida.")
});
