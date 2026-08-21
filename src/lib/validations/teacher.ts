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

/// Capa do módulo criado pelo professor. As missões e os exercícios continuam
/// no CRUD do admin — aqui entra só o que o painel edita.
export const teacherModuleSchema = z.object({
  id: z.string().min(1).optional(),
  trackId: z.string().min(1, "Escolha uma trilha."),
  title: z.string().trim().min(3, "Título obrigatório."),
  description: z.string().trim().min(8, "Descreva o módulo em uma frase.")
});

export type TeacherModuleInput = z.infer<typeof teacherModuleSchema>;
