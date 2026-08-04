"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  createCalendarEventSchema,
  deleteCalendarEventSchema,
  deleteStudyNoteSchema,
  saveStudyNoteSchema
} from "@/lib/validations/workspace";

export type WorkspaceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/** Revalida as rotas do aluno onde a agenda e as notas aparecem. */
function revalidateWorkspace() {
  revalidatePath("/app", "layout");
}

export async function createCalendarEventAction(
  _state: WorkspaceActionState,
  formData: FormData
): Promise<WorkspaceActionState> {
  const user = await requireUser();
  const parsed = createCalendarEventSchema.safeParse({
    title: formData.get("title") ?? "",
    dateKey: formData.get("dateKey") ?? "",
    time: formData.get("time") ?? "",
    type: formData.get("type") ?? "EVENTO"
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Não foi possível salvar o evento."
    };
  }

  const time = parsed.data.time && parsed.data.time.length > 0 ? parsed.data.time : null;

  await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      dateKey: parsed.data.dateKey,
      time,
      type: parsed.data.type
    }
  });

  revalidateWorkspace();
  return { status: "success" };
}

export async function deleteCalendarEventAction(
  _state: WorkspaceActionState,
  formData: FormData
): Promise<WorkspaceActionState> {
  const user = await requireUser();
  const parsed = deleteCalendarEventSchema.safeParse({ id: formData.get("id") ?? "" });

  if (!parsed.success) {
    return { status: "error", message: "Evento inválido." };
  }

  // deleteMany com userId garante que ninguém apague evento de outra pessoa.
  await prisma.calendarEvent.deleteMany({
    where: {
      id: parsed.data.id,
      userId: user.id
    }
  });

  revalidateWorkspace();
  return { status: "success" };
}

export async function createStudyNoteAction(folder?: string) {
  const user = await requireUser();

  const note = await prisma.studyNote.create({
    data: {
      userId: user.id,
      folder: folder && folder.trim().length > 0 ? folder.trim().slice(0, 40) : "Geral"
    }
  });

  revalidateWorkspace();
  return note.id;
}

export async function saveStudyNoteAction(input: {
  id: string;
  title?: string;
  content?: string;
  folder?: string;
  color?: string;
}): Promise<WorkspaceActionState> {
  const user = await requireUser();
  const parsed = saveStudyNoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Não foi possível salvar a nota."
    };
  }

  const { id, ...fields } = parsed.data;

  if (!id) {
    return { status: "error", message: "Nota inválida." };
  }

  const result = await prisma.studyNote.updateMany({
    where: {
      id,
      userId: user.id
    },
    data: fields
  });

  if (result.count === 0) {
    return { status: "error", message: "Nota não encontrada." };
  }

  revalidateWorkspace();
  return { status: "success" };
}

export async function deleteStudyNoteAction(input: { id: string }): Promise<WorkspaceActionState> {
  const user = await requireUser();
  const parsed = deleteStudyNoteSchema.safeParse(input);

  if (!parsed.success) {
    return { status: "error", message: "Nota inválida." };
  }

  await prisma.studyNote.deleteMany({
    where: {
      id: parsed.data.id,
      userId: user.id
    }
  });

  revalidateWorkspace();
  return { status: "success" };
}
