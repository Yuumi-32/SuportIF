"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { teacherNoteSchema } from "@/lib/validations/teacher";
import { teacherCanAccessStudent } from "@/server/queries/tutor";

export type TeacherNoteState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function createTeacherNoteAction(
  _previousState: TeacherNoteState,
  formData: FormData
): Promise<TeacherNoteState> {
  const teacher = await requireRole(["TEACHER"]);
  const parsed = teacherNoteSchema.safeParse({
    studentId: formData.get("studentId"),
    note: formData.get("note")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Observação inválida."
    };
  }

  const canAccess = await teacherCanAccessStudent(teacher.id, parsed.data.studentId);

  if (!canAccess) {
    redirect("/tutor?error=forbidden-student");
  }

  await prisma.teacherNote.create({
    data: {
      teacherId: teacher.id,
      studentId: parsed.data.studentId,
      note: parsed.data.note
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: teacher.id,
      action: "TEACHER_NOTE_CREATED",
      entityType: "USER",
      entityId: parsed.data.studentId
    }
  });

  revalidatePath(`/tutor/alunos/${parsed.data.studentId}`);

  return {
    status: "success",
    message: "Observação salva."
  };
}
