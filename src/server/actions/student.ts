"use server";

import { Prisma, type MasteryStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import { calculateMissionMastery, getMissionStudyStatus } from "@/lib/progress/mission";
import { buildReviewDueDate, getIntervalDaysForGrade } from "@/lib/reviews/schedule";
import { calculateLevel, buildXpDedupeKey } from "@/lib/xp/level";
import {
  answerExerciseSchema,
  completeReviewSchema,
  gradeReviewSchema,
  startTrackSchema
} from "@/lib/validations/student";

const FIRST_CORRECT_EXERCISE_XP = 10;
const REVIEW_COMPLETED_XP = 8;

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
      ...(input.skillId ? { skillId: input.skillId } : {}),
      status: {
        in: ["PENDING", "OVERDUE"]
      }
    }
  });

  if (existing) {
    return {
      created: false,
      reviewId: existing.id
    };
  }

  const review = await tx.reviewSchedule.create({
    data: {
      userId: input.userId,
      missionId: input.missionId,
      skillId: input.skillId ?? null,
      dueAt: buildReviewDueDate(new Date(), 1),
      intervalDays: 1,
      status: "PENDING"
    }
  });

  return {
    created: true,
    reviewId: review.id
  };
}

async function grantBadgeBySlug(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    badgeSlug: string;
  }
) {
  const badge = await tx.badge.findUnique({
    where: {
      slug: input.badgeSlug
    }
  });

  if (!badge) {
    return false;
  }

  await tx.userBadge.upsert({
    where: {
      userId_badgeId: {
        userId: input.userId,
        badgeId: badge.id
      }
    },
    update: {},
    create: {
      userId: input.userId,
      badgeId: badge.id
    }
  });

  return true;
}

export async function startTrackAction(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const parsed = startTrackSchema.safeParse({
    trackId: formData.get("trackId")
  });

  if (!parsed.success) {
    redirect("/app/trilhas?error=invalid-track");
  }

  const track = await prisma.track.findFirst({
    where: {
      id: parsed.data.trackId,
      isPublic: true
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!track) {
    redirect("/app/trilhas?error=track-not-found");
  }

  await prisma.enrollment.upsert({
    where: {
      userId_trackId: {
        userId: user.id,
        trackId: track.id
      }
    },
    update: {
      status: "ACTIVE",
      completedAt: null
    },
    create: {
      userId: user.id,
      trackId: track.id,
      status: "ACTIVE"
    }
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "TRACK_STARTED",
      entityType: "TRACK",
      entityId: track.id
    }
  });

  revalidatePath("/app");
  revalidatePath("/app/trilhas");
  redirect(`/app/trilhas/${track.slug}`);
}

export type ExerciseAnswerState = {
  status: "idle" | "success" | "error";
  message?: string;
  feedback?: string;
  isCorrect?: boolean;
  xpAwarded?: number;
  totalXp?: number;
  level?: number;
  masteryStatus?: MasteryStatus;
  reviewCreated?: boolean;
};

export async function answerExerciseAction(
  _previousState: ExerciseAnswerState,
  formData: FormData
): Promise<ExerciseAnswerState> {
  const user = await requireRole(["STUDENT"]);
  const parsed = answerExerciseSchema.safeParse({
    exerciseId: formData.get("exerciseId"),
    selectedOptionId: formData.get("selectedOptionId")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Resposta inválida."
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const exercise = await tx.exercise.findUnique({
      where: {
        id: parsed.data.exerciseId
      },
      include: {
        options: true,
        mission: {
          include: {
            exercises: {
              select: {
                id: true
              }
            },
            skills: {
              select: {
                skillId: true
              }
            },
            module: {
              include: {
                track: {
                  select: {
                    id: true,
                    slug: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!exercise || exercise.type !== "MULTIPLE_CHOICE") {
      return {
        status: "error" as const,
        message: "Exercício não encontrado."
      };
    }

    const selectedOption = exercise.options.find((option) => option.id === parsed.data.selectedOptionId);

    if (!selectedOption) {
      return {
        status: "error" as const,
        message: "Alternativa inválida para este exercício."
      };
    }

    await tx.enrollment.upsert({
      where: {
        userId_trackId: {
          userId: user.id,
          trackId: exercise.mission.module.track.id
        }
      },
      update: {
        status: "ACTIVE"
      },
      create: {
        userId: user.id,
        trackId: exercise.mission.module.track.id,
        status: "ACTIVE"
      }
    });

    await tx.exerciseAttempt.create({
      data: {
        userId: user.id,
        exerciseId: exercise.id,
        selectedOptionId: selectedOption.id,
        isCorrect: selectedOption.isCorrect,
        feedback: selectedOption.feedback
      }
    });

    const missionExerciseIds = exercise.mission.exercises.map((missionExercise) => missionExercise.id);
    const attempts = await tx.exerciseAttempt.findMany({
      where: {
        userId: user.id,
        exerciseId: {
          in: missionExerciseIds
        }
      },
      select: {
        exerciseId: true,
        isCorrect: true
      }
    });

    const correctExerciseIds = new Set(
      attempts.filter((attempt) => attempt.isCorrect).map((attempt) => attempt.exerciseId)
    );

    const progressInput = {
      attemptsCount: attempts.length,
      correctCount: correctExerciseIds.size,
      exerciseCount: missionExerciseIds.length
    };
    const masteryStatus = calculateMissionMastery(progressInput);
    const status = getMissionStudyStatus(progressInput);
    const existingProgress = await tx.missionProgress.findUnique({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId: exercise.missionId
        }
      }
    });

    await tx.missionProgress.upsert({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId: exercise.missionId
        }
      },
      update: {
        status,
        masteryStatus,
        attemptsCount: progressInput.attemptsCount,
        correctCount: progressInput.correctCount,
        lastStudiedAt: new Date(),
        completedAt:
          status === "COMPLETED"
            ? existingProgress?.completedAt ?? new Date()
            : existingProgress?.completedAt
      },
      create: {
        userId: user.id,
        missionId: exercise.missionId,
        status,
        masteryStatus,
        attemptsCount: progressInput.attemptsCount,
        correctCount: progressInput.correctCount,
        lastStudiedAt: new Date(),
        completedAt: status === "COMPLETED" ? new Date() : null
      }
    });

    const skillId = exercise.skillId ?? exercise.mission.skills[0]?.skillId ?? null;

    if (skillId) {
      await tx.userSkillProgress.upsert({
        where: {
          userId_skillId: {
            userId: user.id,
            skillId
          }
        },
        update: {
          masteryStatus,
          score:
            progressInput.exerciseCount > 0
              ? Math.round((progressInput.correctCount / progressInput.exerciseCount) * 100)
              : 0,
          lastPracticedAt: new Date()
        },
        create: {
          userId: user.id,
          skillId,
          masteryStatus,
          score:
            progressInput.exerciseCount > 0
              ? Math.round((progressInput.correctCount / progressInput.exerciseCount) * 100)
              : 0,
          lastPracticedAt: new Date()
        }
      });
    }

    let xpAwarded = 0;
    let profileSnapshot = {
      totalXp: user.profile?.totalXp ?? 0,
      level: user.profile?.level ?? 1
    };

    if (selectedOption.isCorrect) {
      const exerciseXp = await grantXpOnce(tx, {
        userId: user.id,
        amount: FIRST_CORRECT_EXERCISE_XP,
        reason: "EXERCISE_FIRST_CORRECT",
        referenceType: "EXERCISE",
        referenceId: exercise.id
      });

      xpAwarded += exerciseXp.amount;
      profileSnapshot = {
        totalXp: exerciseXp.totalXp,
        level: exerciseXp.level
      };
    }

    const review = selectedOption.isCorrect && status !== "COMPLETED"
      ? { created: false }
      : await ensurePendingReview(tx, {
          userId: user.id,
          missionId: exercise.missionId,
          skillId
        });

    if (status === "COMPLETED") {
      const missionXp = await grantXpOnce(tx, {
        userId: user.id,
        amount: exercise.mission.xpReward,
        reason: "MISSION_COMPLETED",
        referenceType: "MISSION",
        referenceId: exercise.missionId
      });

      xpAwarded += missionXp.amount;
      profileSnapshot = {
        totalXp: missionXp.totalXp,
        level: missionXp.level
      };

      await grantBadgeBySlug(tx, {
        userId: user.id,
        badgeSlug: "primeira-missao"
      });
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: selectedOption.isCorrect ? "EXERCISE_CORRECT" : "EXERCISE_WRONG",
        entityType: "EXERCISE",
        entityId: exercise.id
      }
    });

    return {
      status: "success" as const,
      message: selectedOption.isCorrect ? "Resposta correta." : "Resposta registrada.",
      feedback: selectedOption.feedback,
      isCorrect: selectedOption.isCorrect,
      xpAwarded,
      totalXp: profileSnapshot.totalXp,
      level: profileSnapshot.level,
      masteryStatus,
      reviewCreated: review.created,
      trackSlug: exercise.mission.module.track.slug,
      missionId: exercise.missionId
    };
  });

  if (result.status === "success") {
    revalidatePath("/app");
    revalidatePath("/app/trilhas");
    revalidatePath(`/app/trilhas/${result.trackSlug}`);
    revalidatePath(`/app/missoes/${result.missionId}`);
    revalidatePath("/app/revisoes");
  }

  return result;
}

export async function completeReviewAction(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const parsed = completeReviewSchema.safeParse({
    reviewId: formData.get("reviewId")
  });

  if (!parsed.success) {
    redirect("/app/revisoes?error=invalid-review");
  }

  await prisma.$transaction(async (tx) => {
    const review = await tx.reviewSchedule.findFirst({
      where: {
        id: parsed.data.reviewId,
        userId: user.id,
        status: {
          in: ["PENDING", "OVERDUE"]
        }
      }
    });

    if (!review) {
      return;
    }

    await tx.reviewSchedule.update({
      where: {
        id: review.id
      },
      data: {
        status: "DONE",
        completedAt: new Date()
      }
    });

    await grantXpOnce(tx, {
      userId: user.id,
      amount: REVIEW_COMPLETED_XP,
      reason: "REVIEW_COMPLETED",
      referenceType: "REVIEW",
      referenceId: review.id
    });

    await grantBadgeBySlug(tx, {
      userId: user.id,
      badgeSlug: "revisao-em-dia"
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "REVIEW_COMPLETED",
        entityType: "REVIEW",
        entityId: review.id
      }
    });
  });

  revalidatePath("/app");
  revalidatePath("/app/revisoes");
}

/**
 * Conclui a revisão registrando como o aluno se saiu e já agenda a próxima
 * ocorrência com um intervalo maior ou menor conforme a nota.
 */
export async function gradeReviewAction(formData: FormData) {
  const user = await requireRole(["STUDENT"]);
  const parsed = gradeReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    grade: formData.get("grade")
  });

  if (!parsed.success) {
    redirect("/app/revisoes?error=invalid-review");
  }

  await prisma.$transaction(async (tx) => {
    const review = await tx.reviewSchedule.findFirst({
      where: {
        id: parsed.data.reviewId,
        userId: user.id,
        status: {
          in: ["PENDING", "OVERDUE"]
        }
      }
    });

    if (!review) {
      return;
    }

    await tx.reviewSchedule.update({
      where: {
        id: review.id
      },
      data: {
        status: "DONE",
        completedAt: new Date()
      }
    });

    const nextIntervalDays = getIntervalDaysForGrade(parsed.data.grade, review.intervalDays);

    await tx.reviewSchedule.create({
      data: {
        userId: user.id,
        missionId: review.missionId,
        skillId: review.skillId,
        dueAt: buildReviewDueDate(new Date(), nextIntervalDays),
        intervalDays: nextIntervalDays,
        status: "PENDING"
      }
    });

    await grantXpOnce(tx, {
      userId: user.id,
      amount: REVIEW_COMPLETED_XP,
      reason: "REVIEW_COMPLETED",
      referenceType: "REVIEW",
      referenceId: review.id
    });

    await grantBadgeBySlug(tx, {
      userId: user.id,
      badgeSlug: "revisao-em-dia"
    });

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "REVIEW_COMPLETED",
        entityType: "REVIEW",
        entityId: review.id
      }
    });
  });

  revalidatePath("/app");
  revalidatePath("/app/revisoes");
}
