"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { INSTITUTION_ID } from "@/server/queries/admin";
import { formatTeacherName, type AdminActionResult } from "@/lib/admin/presentation";
import {
  adminBadgeSchema,
  adminClassSchema,
  adminExerciseSchema,
  adminMissionSchema,
  adminModuleSchema,
  adminSimulationSchema,
  adminTrackSchema,
  institutionSettingsSchema,
  parseExerciseOptionsFromForm
} from "@/lib/validations/admin";

function redirectWithError(path: string, code: string): never {
  redirect(`${path}?error=${code}`);
}

async function requireAdminId() {
  const user = await requireRole(["ADMIN"]);
  return user.id;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function writeAdminLog(adminId: string, action: string, entityType: string, entityId: string) {
  await prisma.activityLog.create({
    data: {
      userId: adminId,
      action,
      entityType,
      entityId
    }
  });
}

export async function saveTrackAction(formData: FormData) {
  const adminId = await requireAdminId();
  const parsed = adminTrackSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithError("/admin/trilhas", "invalid");
  }

  const duplicate = await prisma.track.findFirst({
    where: {
      slug: parsed.data.slug,
      ...(parsed.data.id ? { id: { not: parsed.data.id } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    redirectWithError("/admin/trilhas", "duplicate-slug");
  }

  const track = parsed.data.id
    ? await prisma.track.update({
        where: { id: parsed.data.id },
        data: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          description: parsed.data.description,
          area: parsed.data.area,
          level: parsed.data.level,
          coverIcon: parsed.data.coverIcon,
          color: parsed.data.color,
          isPublic: parsed.data.isPublic,
          isDemo: parsed.data.isDemo
        }
      })
    : await prisma.track.create({
        data: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          description: parsed.data.description,
          area: parsed.data.area,
          level: parsed.data.level,
          coverIcon: parsed.data.coverIcon,
          color: parsed.data.color,
          isPublic: parsed.data.isPublic,
          isDemo: parsed.data.isDemo
        }
      });

  await writeAdminLog(adminId, parsed.data.id ? "ADMIN_TRACK_UPDATED" : "ADMIN_TRACK_CREATED", "TRACK", track.id);
  revalidatePath("/admin/trilhas");
  revalidatePath("/app/trilhas");
  redirect("/admin/trilhas?saved=track");
}

export async function saveModuleAction(formData: FormData) {
  const adminId = await requireAdminId();
  const parsed = adminModuleSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithError("/admin/modulos", "invalid");
  }

  const duplicate = await prisma.module.findFirst({
    where: {
      trackId: parsed.data.trackId,
      slug: parsed.data.slug,
      ...(parsed.data.id ? { id: { not: parsed.data.id } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    redirectWithError("/admin/modulos", "duplicate-slug");
  }

  // Aprovar pelo formulário conta como revisão: é a mesma decisão que a aba
  // Conteúdo do painel grava, só que tomada aqui.
  const review =
    parsed.data.approvalStatus === "PENDING"
      ? { reviewedAt: null, reviewedById: null }
      : { reviewedAt: new Date(), reviewedById: adminId };

  const contentModule = parsed.data.id
    ? await prisma.module.update({
        where: { id: parsed.data.id },
        data: {
          trackId: parsed.data.trackId,
          title: parsed.data.title,
          slug: parsed.data.slug,
          description: parsed.data.description,
          order: parsed.data.order,
          approvalStatus: parsed.data.approvalStatus,
          isDemo: parsed.data.isDemo,
          ...review
        }
      })
    : await prisma.module.create({
        data: {
          trackId: parsed.data.trackId,
          title: parsed.data.title,
          slug: parsed.data.slug,
          description: parsed.data.description,
          order: parsed.data.order,
          approvalStatus: parsed.data.approvalStatus,
          isDemo: parsed.data.isDemo,
          createdById: adminId,
          ...review
        }
      });

  await writeAdminLog(
    adminId,
    parsed.data.id ? "ADMIN_MODULE_UPDATED" : "ADMIN_MODULE_CREATED",
    "MODULE",
    contentModule.id
  );
  revalidatePath("/admin/modulos");
  revalidatePath("/admin");
  revalidatePath("/app/trilhas");
  redirect("/admin/modulos?saved=module");
}

export async function saveMissionAction(formData: FormData) {
  const adminId = await requireAdminId();
  const parsed = adminMissionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithError("/admin/missoes", "invalid");
  }

  const duplicate = await prisma.mission.findFirst({
    where: {
      moduleId: parsed.data.moduleId,
      slug: parsed.data.slug,
      ...(parsed.data.id ? { id: { not: parsed.data.id } } : {})
    },
    select: { id: true }
  });

  if (duplicate) {
    redirectWithError("/admin/missoes", "duplicate-slug");
  }

  const mission = parsed.data.id
    ? await prisma.mission.update({
        where: { id: parsed.data.id },
        data: {
          moduleId: parsed.data.moduleId,
          title: parsed.data.title,
          slug: parsed.data.slug,
          shortDescription: parsed.data.shortDescription,
          objective: parsed.data.objective,
          quickExplanation: parsed.data.quickExplanation,
          detailedExplanation: parsed.data.detailedExplanation,
          analogy: parsed.data.analogy,
          practicalExample: parsed.data.practicalExample,
          guidedExercisePrompt: parsed.data.guidedExercisePrompt,
          challengePrompt: parsed.data.challengePrompt,
          summary: parsed.data.summary,
          attentionPoints: parsed.data.attentionPoints,
          difficulty: parsed.data.difficulty,
          xpReward: parsed.data.xpReward,
          estimatedMinutes: parsed.data.estimatedMinutes,
          order: parsed.data.order,
          isDemo: parsed.data.isDemo
        }
      })
    : await prisma.mission.create({
        data: {
          moduleId: parsed.data.moduleId,
          title: parsed.data.title,
          slug: parsed.data.slug,
          shortDescription: parsed.data.shortDescription,
          objective: parsed.data.objective,
          quickExplanation: parsed.data.quickExplanation,
          detailedExplanation: parsed.data.detailedExplanation,
          analogy: parsed.data.analogy,
          practicalExample: parsed.data.practicalExample,
          guidedExercisePrompt: parsed.data.guidedExercisePrompt,
          challengePrompt: parsed.data.challengePrompt,
          summary: parsed.data.summary,
          attentionPoints: parsed.data.attentionPoints,
          difficulty: parsed.data.difficulty,
          xpReward: parsed.data.xpReward,
          estimatedMinutes: parsed.data.estimatedMinutes,
          order: parsed.data.order,
          isDemo: parsed.data.isDemo
        }
      });

  await writeAdminLog(adminId, parsed.data.id ? "ADMIN_MISSION_UPDATED" : "ADMIN_MISSION_CREATED", "MISSION", mission.id);
  revalidatePath("/admin/missoes");
  revalidatePath("/app/trilhas");
  redirect("/admin/missoes?saved=mission");
}

export async function saveExerciseAction(formData: FormData) {
  const adminId = await requireAdminId();
  const parsed = adminExerciseSchema.safeParse({
    id: formData.get("id"),
    missionId: formData.get("missionId"),
    type: formData.get("type"),
    prompt: formData.get("prompt"),
    explanation: formData.get("explanation"),
    difficulty: formData.get("difficulty"),
    skillId: formData.get("skillId"),
    order: formData.get("order"),
    isDemo: formData.get("isDemo"),
    options: parseExerciseOptionsFromForm(formData)
  });

  if (!parsed.success) {
    redirectWithError("/admin/exercicios", "invalid");
  }

  let exercise: { id: string };

  try {
    exercise = await prisma.$transaction(async (tx) => {
    const saved = parsed.data.id
      ? await tx.exercise.update({
          where: { id: parsed.data.id },
          data: {
            missionId: parsed.data.missionId,
            type: parsed.data.type,
            prompt: parsed.data.prompt,
            explanation: parsed.data.explanation,
            difficulty: parsed.data.difficulty,
            skillId: parsed.data.skillId ?? null,
            order: parsed.data.order,
            isDemo: parsed.data.isDemo
          }
        })
      : await tx.exercise.create({
          data: {
            missionId: parsed.data.missionId,
            type: parsed.data.type,
            prompt: parsed.data.prompt,
            explanation: parsed.data.explanation,
            difficulty: parsed.data.difficulty,
            skillId: parsed.data.skillId ?? null,
            order: parsed.data.order,
            isDemo: parsed.data.isDemo
          }
        });

    const existingOptions = await tx.exerciseOption.findMany({
      where: { exerciseId: saved.id },
      select: { id: true }
    });
    const nextIds = parsed.data.options.map((option) => option.id).filter(Boolean);
    const removedIds = existingOptions.map((option) => option.id).filter((id) => !nextIds.includes(id));

    for (const removedId of removedIds) {
      const [attempts, answers] = await Promise.all([
        tx.exerciseAttempt.count({ where: { selectedOptionId: removedId } }),
        tx.simulationAnswer.count({ where: { selectedOptionId: removedId } })
      ]);

      if (attempts > 0 || answers > 0) {
        throw new Error("OPTION_HAS_DEPENDENCIES");
      }

      await tx.exerciseOption.delete({ where: { id: removedId } });
    }

    for (const option of parsed.data.options) {
      if (option.id) {
        const result = await tx.exerciseOption.updateMany({
          where: {
            id: option.id,
            exerciseId: saved.id
          },
          data: {
            text: option.text,
            feedback: option.feedback,
            isCorrect: option.isCorrect
          }
        });

        if (result.count === 0) {
          throw new Error("OPTION_DOES_NOT_BELONG_TO_EXERCISE");
        }
      } else {
        await tx.exerciseOption.create({
          data: {
            exerciseId: saved.id,
            text: option.text,
            feedback: option.feedback,
            isCorrect: option.isCorrect
          }
        });
      }
    }

      return saved;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "OPTION_HAS_DEPENDENCIES") {
      redirectWithError("/admin/exercicios", "option-dependencies");
    }

    if (error instanceof Error && error.message === "OPTION_DOES_NOT_BELONG_TO_EXERCISE") {
      redirectWithError("/admin/exercicios", "invalid-option");
    }

    throw error;
  }

  await writeAdminLog(
    adminId,
    parsed.data.id ? "ADMIN_EXERCISE_UPDATED" : "ADMIN_EXERCISE_CREATED",
    "EXERCISE",
    exercise.id
  );
  revalidatePath("/admin/exercicios");
  revalidatePath("/app/trilhas");
  redirect("/admin/exercicios?saved=exercise");
}

export async function saveSimulationAction(formData: FormData) {
  const adminId = await requireAdminId();
  const parsed = adminSimulationSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    trackId: formData.get("trackId"),
    moduleId: formData.get("moduleId"),
    isDemo: formData.get("isDemo"),
    exerciseIds: Array.from(new Set(formData.getAll("exerciseIds").map(String).filter(Boolean)))
  });

  if (!parsed.success) {
    redirectWithError("/admin/simulados", "invalid");
  }

  const simulation = await prisma.$transaction(async (tx) => {
    const saved = parsed.data.id
      ? await tx.simulation.update({
          where: { id: parsed.data.id },
          data: {
            title: parsed.data.title,
            description: parsed.data.description,
            type: parsed.data.type,
            trackId: parsed.data.trackId ?? null,
            moduleId: parsed.data.moduleId ?? null,
            isDemo: parsed.data.isDemo
          }
        })
      : await tx.simulation.create({
          data: {
            title: parsed.data.title,
            description: parsed.data.description,
            type: parsed.data.type,
            trackId: parsed.data.trackId ?? null,
            moduleId: parsed.data.moduleId ?? null,
            isDemo: parsed.data.isDemo
          }
        });

    await tx.simulationQuestion.deleteMany({
      where: { simulationId: saved.id }
    });

    await tx.simulationQuestion.createMany({
      data: parsed.data.exerciseIds.map((exerciseId, index) => ({
        simulationId: saved.id,
        exerciseId,
        order: index + 1
      }))
    });

    return saved;
  });

  await writeAdminLog(
    adminId,
    parsed.data.id ? "ADMIN_SIMULATION_UPDATED" : "ADMIN_SIMULATION_CREATED",
    "SIMULATION",
    simulation.id
  );
  revalidatePath("/admin/simulados");
  revalidatePath("/app/simulados");
  redirect("/admin/simulados?saved=simulation");
}

export async function saveBadgeAction(formData: FormData) {
  const adminId = await requireAdminId();
  const parsed = adminBadgeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirectWithError("/admin/badges", "invalid");
  }

  try {
    const badge = parsed.data.id
      ? await prisma.badge.update({
          where: { id: parsed.data.id },
          data: {
            title: parsed.data.title,
            slug: parsed.data.slug,
            description: parsed.data.description,
            icon: parsed.data.icon,
            rule: parsed.data.rule,
            isDemo: parsed.data.isDemo
          }
        })
      : await prisma.badge.create({
          data: {
            title: parsed.data.title,
            slug: parsed.data.slug,
            description: parsed.data.description,
            icon: parsed.data.icon,
            rule: parsed.data.rule,
            isDemo: parsed.data.isDemo
          }
        });

    await writeAdminLog(adminId, parsed.data.id ? "ADMIN_BADGE_UPDATED" : "ADMIN_BADGE_CREATED", "BADGE", badge.id);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectWithError("/admin/badges", "duplicate-slug");
    }

    throw error;
  }

  revalidatePath("/admin/badges");
  redirect("/admin/badges?saved=badge");
}

/**
 * Suspende ou reativa uma conta.
 *
 * Suspender também apaga as sessões abertas: sem isso quem já estava logado
 * continuaria navegando até o cookie vencer.
 */
export async function setUserSuspensionAction(userId: string, suspended: boolean): Promise<AdminActionResult> {
  const admin = await requireRole(["ADMIN"]);

  if (userId === admin.id) {
    return { ok: false, message: "Você não pode suspender a própria conta." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });

  if (!target) {
    return { ok: false, message: "Conta não encontrada." };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { suspendedAt: suspended ? new Date() : null }
  });

  if (suspended) {
    await prisma.session.deleteMany({ where: { userId: target.id } });
  }

  await writeAdminLog(admin.id, suspended ? "ADMIN_USER_SUSPENDED" : "ADMIN_USER_REACTIVATED", "USER", target.id);
  revalidatePath("/admin");

  return {
    ok: true,
    message: suspended ? `Conta de ${target.name} foi suspensa.` : `Conta de ${target.name} foi reativada.`
  };
}

/**
 * Publica ou devolve um módulo. Aprovado é o único estado que o aluno enxerga,
 * então esta é a chave que liga o conteúdo para as turmas.
 */
export async function setModuleApprovalAction(
  moduleId: string,
  status: "APPROVED" | "REJECTED"
): Promise<AdminActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const target = await prisma.module.findUnique({ where: { id: moduleId }, select: { id: true, title: true } });

  if (!target) {
    return { ok: false, message: "Módulo não encontrado." };
  }

  await prisma.module.update({
    where: { id: target.id },
    data: { approvalStatus: status, reviewedAt: new Date(), reviewedById: admin.id }
  });

  await writeAdminLog(
    admin.id,
    status === "APPROVED" ? "ADMIN_MODULE_APPROVED" : "ADMIN_MODULE_REJECTED",
    "MODULE",
    target.id
  );
  revalidatePath("/admin");
  revalidatePath("/admin/modulos");
  revalidatePath("/app/trilhas");

  return {
    ok: true,
    message:
      status === "APPROVED"
        ? `"${target.title}" foi aprovado e publicado.`
        : `"${target.title}" foi rejeitado e saiu do ar.`
  };
}

export async function createClassGroupAction(input: {
  name: string;
  course: string;
  term: string;
  level: string;
  teacherId: string;
}): Promise<AdminActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = adminClassSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const teacher = await prisma.user.findFirst({
    where: { id: parsed.data.teacherId, role: "TEACHER" },
    select: { id: true, name: true }
  });

  if (!teacher) {
    return { ok: false, message: "Escolha um professor válido." };
  }

  const classGroup = await prisma.classGroup.create({
    data: {
      name: parsed.data.name,
      // A descrição é o que o painel do tutor mostra; montamos a partir do que
      // o admin preencheu para a turma nunca nascer sem contexto.
      description: `${parsed.data.course} · ${parsed.data.term}`,
      course: parsed.data.course,
      term: parsed.data.term,
      level: parsed.data.level,
      isDemo: false,
      memberships: {
        create: [{ userId: teacher.id, roleInClass: "TEACHER" }]
      }
    }
  });

  await writeAdminLog(admin.id, "ADMIN_CLASS_CREATED", "CLASS_GROUP", classGroup.id);
  revalidatePath("/admin");
  revalidatePath("/tutor/turmas");

  return { ok: true, message: `Turma ${classGroup.name} criada e vinculada ao ${formatTeacherName(teacher.name)}.` };
}

/**
 * Salva a configuração da instituição — a linha única do painel.
 *
 * Os três campos valem de verdade: o nome aparece na tela de entrada, a cor
 * vira o tema padrão de quem ainda não personalizou e o domínio é cobrado no
 * cadastro quando a exigência está ligada.
 */
export async function saveInstitutionSettingsAction(input: {
  name: string;
  emailDomain: string;
  primaryColor: string;
  openRegistration: boolean;
  requireInstitutionalEmail: boolean;
}): Promise<AdminActionResult> {
  const admin = await requireRole(["ADMIN"]);
  const parsed = institutionSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (parsed.data.requireInstitutionalEmail && !parsed.data.emailDomain) {
    return { ok: false, message: "Informe o domínio para poder exigi-lo no cadastro." };
  }

  await prisma.institutionSettings.upsert({
    where: { id: INSTITUTION_ID },
    update: parsed.data,
    create: { id: INSTITUTION_ID, ...parsed.data }
  });

  await writeAdminLog(admin.id, "ADMIN_SETTINGS_UPDATED", "SETTINGS", INSTITUTION_ID);
  revalidatePath("/admin");
  revalidatePath("/", "layout");

  return { ok: true, message: "Configurações da instituição salvas." };
}
