import { z } from "zod";

export const teacherNoteSchema = z.object({
  studentId: z.string().min(1, "Aluno inválido."),
  note: z
    .string()
    .trim()
    .min(3, "A observação precisa ter pelo menos 3 caracteres.")
    .max(800, "A observação deve ter no máximo 800 caracteres.")
});

export type TeacherNoteInput = z.infer<typeof teacherNoteSchema>;
