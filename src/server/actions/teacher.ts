"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import type { TeacherActionResult } from "@/lib/tutor/presentation";
import { teacherModuleSchema, teacherNoteSchema } from "@/lib/validations/teacher";
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

async function writeTeacherLog(teacherId: string, action: string, entityType: string, entityId: string) {
  await prisma.activityLog.create({
    data: {
      userId: teacherId,
      action,
      entityType,
      entityId
    }
  });
}

/** Título vira slug: sem acento, minúsculo e com hífen no lugar do resto. */
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Marcador pessoal de acompanhamento.
 *
 * Só vale para aluno de turma do próprio professor, e a marca é dele: outro
 * professor da mesma turma tem a sua.
 */
export async function setStudentFollowAction(
  studentId: string,
  following: boolean
): Promise<TeacherActionResult> {
  const teacher = await requireRole(["TEACHER"]);
  const canAccess = await teacherCanAccessStudent(teacher.id, studentId);

  if (!canAccess) {
    return { ok: false, message: "Este aluno não está em uma das suas turmas." };
  }

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });

  if (!student) {
    return { ok: false, message: "Aluno não encontrado." };
  }

  if (following) {
    await prisma.studentFollow.upsert({
      where: { teacherId_studentId: { teacherId: teacher.id, studentId } },
      create: { teacherId: teacher.id, studentId },
      update: {}
    });
  } else {
    await prisma.studentFollow.deleteMany({ where: { teacherId: teacher.id, studentId } });
  }

  await writeTeacherLog(
    teacher.id,
    following ? "TEACHER_STUDENT_FOLLOWED" : "TEACHER_STUDENT_UNFOLLOWED",
    "USER",
    studentId
  );
  revalidatePath("/tutor");

  return {
    ok: true,
    message: following
      ? `${student.name} entrou na sua lista de acompanhamento.`
      : `${student.name} saiu da sua lista de acompanhamento.`
  };
}

/**
 * Publica ou tira o módulo do ar.
 *
 * O professor publica direto, sem fila de aprovação: `approvalStatus` vai para
 * APPROVED e o módulo aparece na trilha do aluno na hora. Despublicar devolve
 * o módulo para PENDING — volta a ser rascunho, não vira conteúdo rejeitado.
 */
export async function setModulePublicationAction(
  moduleId: string,
  published: boolean
): Promise<TeacherActionResult> {
  const teacher = await requireRole(["TEACHER"]);
  const target = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true, title: true } });

  if (!target) {
    return { ok: false, message: "Módulo não encontrado." };
  }

  await prisma.module.update({
    where: { id: target.id },
    data: {
      approvalStatus: published ? "APPROVED" : "PENDING",
      reviewedAt: new Date(),
      reviewedById: teacher.id
    }
  });

  await writeTeacherLog(
    teacher.id,
    published ? "TEACHER_MODULE_PUBLISHED" : "TEACHER_MODULE_UNPUBLISHED",
    "MODULE",
    target.id
  );
  revalidatePath("/tutor");
  revalidatePath("/app/trilhas");
  revalidatePath("/admin");

  return {
    ok: true,
    message: published
      ? `"${target.title}" foi publicado para as turmas.`
      : `"${target.title}" saiu do ar e voltou a ser rascunho.`
  };
}

/**
 * Cria ou renomeia um módulo pelo painel.
 *
 * O módulo novo nasce rascunho: quem escreve decide a hora de publicar. As
 * missões e os exercícios continuam no CRUD do admin — aqui o professor mexe
 * na capa do módulo e na hora de ele entrar no ar.
 */
export async function saveTeacherModuleAction(input: {
  id?: string;
  trackId: string;
  title: string;
  description: string;
}): Promise<TeacherActionResult> {
  const teacher = await requireRole(["TEACHER"]);
  const parsed = teacherModuleSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados do módulo inválidos." };
  }

  const slug = slugify(parsed.data.title);

  if (!slug) {
    return { ok: false, message: "Use um título com letras ou números." };
  }

  const duplicate = await prisma.module.findFirst({
    where: {
      trackId: parsed.data.trackId,
      slug,
      ...(parsed.data.id ? { id: { not: parsed.data.id } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    return { ok: false, message: "Já existe um módulo com esse título nesta trilha." };
  }

  if (parsed.data.id) {
    const target = await prisma.module.findUnique({ where: { id: parsed.data.id }, select: { id: true } });

    if (!target) {
      return { ok: false, message: "Módulo não encontrado." };
    }

    await prisma.module.update({
      where: { id: target.id },
      data: {
        trackId: parsed.data.trackId,
        title: parsed.data.title,
        slug,
        description: parsed.data.description
      }
    });

    await writeTeacherLog(teacher.id, "TEACHER_MODULE_UPDATED", "MODULE", target.id);
    revalidatePath("/tutor");
    revalidatePath("/app/trilhas");
    revalidatePath("/admin");

    return { ok: true, message: `"${parsed.data.title}" foi atualizado.` };
  }

  // Módulo novo entra no fim da trilha, na ordem em que o aluno vai encontrar.
  const last = await prisma.module.findFirst({
    where: { trackId: parsed.data.trackId },
    orderBy: { order: "desc" },
    select: { order: true }
  });

  const created = await prisma.module.create({
    data: {
      trackId: parsed.data.trackId,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      order: (last?.order ?? 0) + 1,
      approvalStatus: "PENDING",
      createdById: teacher.id,
      isDemo: false
    }
  });

  await writeTeacherLog(teacher.id, "TEACHER_MODULE_CREATED", "MODULE", created.id);
  revalidatePath("/tutor");
  revalidatePath("/admin");

  return {
    ok: true,
    message: `"${parsed.data.title}" foi criado como rascunho. Publique quando o conteúdo estiver pronto.`
  };
}
