"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { buildReviewDueDate } from "@/lib/reviews/schedule";
import {
  buildReviewTargetsFromWrongAnswers,
  calculateSimulationResult,
  type SimulationAnswerInput
} from "@/lib/simulations/results";
import {
  findMissingSimulationAnswers,
  hasDuplicateSimulationAnswers
} from "@/lib/simulations/submission";
import { submitSimulationSchema } from "@/lib/validations/simulation";
import { calculateLevel, buildXpDedupeKey } from "@/lib/xp/level";

const SIMULATION_COMPLETED_XP = 35;

type GrantXpInput = {
  userId: string;
  amount: number;
  reason: string;
  referenceType: string;
  referenceId: string;
};

async function grantXpOnce(tx: Prisma.TransactionClient, input: GrantXpInput) {
  const dedupeKey = buildXpDedupeKey(input.userId, input.reason, input.referenceId);
  const existing = await tx.xPTransaction.findUnique({
    where: {
      dedupeKey
    }
  });

  const profile = await tx.profile.findUnique({
    where: {
      userId: input.userId
    }
  });

  if (existing) {
    return {
      granted: false,
      amount: 0,
      totalXp: profile?.totalXp ?? 0,
      level: profile?.level ?? 1
    };
  }

  await tx.xPTransaction.create({
    data: {
      userId: input.userId,
      amount: input.amount,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      dedupeKey
    }
  });

  const updatedProfile = await tx.profile.upsert({
    where: {
      userId: input.userId
    },
    update: {
      totalXp: {
        increment: input.amount
      }
    },
    create: {
      userId: input.userId,
      totalXp: input.amount,
      level: calculateLevel(input.amount)
    }
  });

  const level = calculateLevel(updatedProfile.totalXp);

  if (updatedProfile.level !== level) {
    await tx.profile.update({
      where: {
        userId: input.userId
      },
      data: {
        level
      }
    });
  }

  return {
    granted: true,
    amount: input.amount,
    totalXp: updatedProfile.totalXp,
    level
  };
}

async function ensurePendingReview(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    missionId: string;
    skillId?: string | null;
  }
) {
  const existing = await tx.reviewSchedule.findFirst({
    where: {
      userId: input.userId,
      missionId: input.missionId,
      skillId: input.skillId ?? null,
      status: {
        in: ["PENDING", "OVERDUE"]
      }
    }
  });

  if (existing) {
    return false;
  }

  await tx.reviewSchedule.create({
    data: {
      userId: input.userId,
      missionId: input.missionId,
      skillId: input.skillId ?? null,
      dueAt: buildReviewDueDate(new Date(), 1),
      intervalDays: 1,
      status: "PENDING"
    }
  });

  return true;
}

async function grantSimulationBadge(tx: Prisma.TransactionClient, userId: string) {
  const badge = await tx.badge.findUnique({
    where: {
      slug: "simulado-concluido"
    }
  });

  if (!badge) {
    return;
  }

  await tx.userBadge.upsert({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id
      }
    },
    update: {},
    create: {
      userId,
      badgeId: badge.id
    }
  });
}

export type SubmitSimulationState = {
  status: "idle" | "error";
  message?: string;
};

export async function submitSimulationAction(
  _previousState: SubmitSimulationState,
  formData: FormData
): Promise<SubmitSimulationState> {
  const user = await requireRole(["STUDENT"]);
  const simulationId = String(formData.get("simulationId") ?? "");
  const exerciseIds = formData.getAll("exerciseId").map((value) => String(value));
  const answers = exerciseIds.map((exerciseId) => ({
    exerciseId,
    selectedOptionId: String(formData.get(`answer-${exerciseId}`) ?? "")
  }));

  const parsed = submitSimulationSchema.safeParse({
    simulationId,
    answers
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Envio inválido."
    };
  }

  if (hasDuplicateSimulationAnswers(parsed.data.answers)) {
    return {
      status: "error",
      message: "Há respostas duplicadas no envio."
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const simulation = await tx.simulation.findUnique({
      where: {
        id: parsed.data.simulationId
      },
      include: {
        questions: {
          orderBy: {
            order: "asc"
          },
          include: {
            exercise: {
              include: {
                skill: true,
                options: true,
                mission: {
                  include: {
                    module: {
                      include: {
                        track: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!simulation) {
      return {
        status: "error" as const,
        message: "Simulado não encontrado."
      };
    }

    if (simulation.questions.length === 0) {
      return {
        status: "error" as const,
        message: "Este simulado ainda não possui questões."
      };
    }

    const expectedExerciseIds = simulation.questions.map((question) => question.exerciseId);
    const submittedExerciseIds = new Set(parsed.data.answers.map((answer) => answer.exerciseId));
    const unknownExercise = parsed.data.answers.find(
      (answer) => !expectedExerciseIds.includes(answer.exerciseId)
    );

    if (unknownExercise) {
      return {
        status: "error" as const,
        message: "O envio contém questão que não pertence a este simulado."
      };
    }

    const missing = findMissingSimulationAnswers(expectedExerciseIds, parsed.data.answers);

    if (missing.length > 0 || submittedExerciseIds.size !== expectedExerciseIds.length) {
      return {
        status: "error" as const,
        message: "Responda todas as questões antes de enviar."
      };
    }

    const answersByExerciseId = new Map(
      parsed.data.answers.map((answer) => [answer.exerciseId, answer.selectedOptionId])
    );

    const answerInputs: SimulationAnswerInput[] = [];
    const answerRows = [];

    for (const question of simulation.questions) {
      const selectedOptionId = answersByExerciseId.get(question.exerciseId);
      const selectedOption = question.exercise.options.find((option) => option.id === selectedOptionId);

      if (!selectedOption) {
        return {
          status: "error" as const,
          message: "Uma alternativa enviada não pertence ao exercício correspondente."
        };
      }

      const fallbackSlug = `${question.exercise.mission.module.track.slug}/${question.exercise.mission.module.slug}/${question.exercise.mission.slug}`;
      const fallbackName = `${question.exercise.mission.module.track.title} · ${question.exercise.mission.module.title} · ${question.exercise.mission.title}`;

      answerInputs.push({
        skillSlug: question.exercise.skill?.slug,
        skillName: question.exercise.skill?.name,
        fallbackSlug,
        fallbackName,
        missionId: question.exercise.missionId,
        skillId: question.exercise.skillId,
        isCorrect: selectedOption.isCorrect
      });

      answerRows.push({
        exerciseId: question.exerciseId,
        selectedOptionId: selectedOption.id,
        isCorrect: selectedOption.isCorrect
      });
    }

    const simulationResult = calculateSimulationResult(answerInputs);

    const attempt = await tx.simulationAttempt.create({
      data: {
        userId: user.id,
        simulationId: simulation.id,
        startedAt: new Date(),
        finishedAt: new Date(),
        score: simulationResult.score,
        correctCount: simulationResult.correctCount,
        wrongCount: simulationResult.wrongCount,
        weakSkillsJson: simulationResult.weakSkills,
        strongSkillsJson: simulationResult.strongSkills,
        answers: {
          create: answerRows
        }
      }
    });

    const reviewTargets = buildReviewTargetsFromWrongAnswers(answerInputs);
    let reviewsCreated = 0;

    for (const target of reviewTargets) {
      const created = await ensurePendingReview(tx, {
        userId: user.id,
        missionId: target.missionId,
        skillId: target.skillId
      });

      reviewsCreated += created ? 1 : 0;
    }

    const xp = await grantXpOnce(tx, {
      userId: user.id,
      amount: SIMULATION_COMPLETED_XP,
      reason: "SIMULATION_COMPLETED",
      referenceType: "SIMULATION",
      referenceId: simulation.id
    });

    await grantSimulationBadge(tx, user.id);

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "SIMULATION_SUBMITTED",
        entityType: "SIMULATION",
        entityId: simulation.id
      }
    });

    return {
      status: "success" as const,
      simulationId: simulation.id,
      attemptId: attempt.id,
      xpAwarded: xp.amount,
      reviewsCreated
    };
  });

  if (result.status === "error") {
    return result;
  }

  revalidatePath("/app");
  revalidatePath("/app/revisoes");
  revalidatePath("/app/simulados");
  revalidatePath(`/app/simulados/${result.simulationId}`);
  revalidatePath(`/app/simulados/${result.simulationId}/resultado`);
  redirect(`/app/simulados/${result.simulationId}/resultado?attemptId=${result.attemptId}`);
}
