import type { EngagementSeverity } from "@prisma/client";

import { formatRelativeDay } from "@/lib/format/relative-date";
import { prisma } from "@/lib/prisma/client";
import { isMissionCompleted } from "@/lib/progress/mission";
import { calculateTrackProgressPercent } from "@/lib/progress/track";
import {
  aggregateDifficultyItems,
  buildAttentionReason,
  calculateAverageProgress,
  getHighestEngagementSeverity,
  isReviewOverdue,
  type DifficultyAnswerInput
} from "@/lib/tutor/analytics";

async function getTeacherClassIds(teacherId: string) {
  const memberships = await prisma.classMembership.findMany({
    where: {
      userId: teacherId,
      roleInClass: "TEACHER"
    },
    select: {
      classGroupId: true
    }
  });

  return memberships.map((membership) => membership.classGroupId);
}

async function assertTeacherCanAccessStudent(teacherId: string, studentId: string) {
  const teacherClassIds = await getTeacherClassIds(teacherId);

  if (teacherClassIds.length === 0) {
    return false;
  }

  const membership = await prisma.classMembership.findFirst({
    where: {
      userId: studentId,
      roleInClass: "STUDENT",
      classGroupId: {
        in: teacherClassIds
      }
    }
  });

  return Boolean(membership);
}

async function getStudentTrackSummaries(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: "ACTIVE"
    },
    include: {
      track: {
        include: {
          modules: {
            // Mesmo recorte do app do aluno: módulo não publicado não conta no
            // progresso que o tutor vê.
            where: {
              approvalStatus: "APPROVED"
            },
            orderBy: {
              order: "asc"
            },
            include: {
              missions: {
                orderBy: {
                  order: "asc"
                },
                include: {
                  progress: {
                    where: {
                      userId
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      startedAt: "desc"
    }
  });

  return enrollments.map((enrollment) => {
    const missions = enrollment.track.modules.flatMap((module) => module.missions);
    const completed = missions.filter((mission) => {
      const progress = mission.progress[0];
      return isMissionCompleted(progress?.status, progress?.masteryStatus);
    }).length;

    return {
      enrollmentId: enrollment.id,
      trackId: enrollment.trackId,
      title: enrollment.track.title,
      slug: enrollment.track.slug,
      area: enrollment.track.area,
      completed,
      total: missions.length,
      progressPercent: calculateTrackProgressPercent(completed, missions.length)
    };
  });
}

async function getStudentSummary(userId: string, classGroupId?: string) {
  const [user, trackSummaries, reviews, signals, latestActivity, latestSimulation] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId
      },
      include: {
        profile: true
      }
    }),
    getStudentTrackSummaries(userId),
    prisma.reviewSchedule.findMany({
      where: {
        userId,
        status: {
          in: ["PENDING", "OVERDUE"]
        }
      }
    }),
    prisma.engagementSignal.findMany({
      where: {
        userId,
        ...(classGroupId ? { classGroupId } : {}),
        resolvedAt: null
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.activityLog.findFirst({
      where: {
        userId
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.simulationAttempt.findFirst({
      where: {
        userId
      },
      include: {
        simulation: true
      },
      orderBy: {
        finishedAt: "desc"
      }
    })
  ]);

  if (!user) {
    return null;
  }

  const now = new Date();
  const overdueReviews = reviews.filter((review) => isReviewOverdue(review, now)).length;
  const progressPercent = calculateAverageProgress(
    trackSummaries.map((track) => ({
      completed: track.completed,
      total: track.total
    }))
  );
  const signalSeverity = getHighestEngagementSeverity(signals.map((signal) => signal.severity));
  const inactiveDays = user.lastLoginAt
    ? Math.floor((now.getTime() - user.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const severity = getHighestEngagementSeverity([
    signalSeverity,
    overdueReviews > 0 ? "ATTENTION" : "NORMAL",
    inactiveDays !== null && inactiveDays >= 14 ? "HIGH_RISK" : "NORMAL"
  ]);

  return {
    user,
    trackSummaries,
    progressPercent,
    pendingReviews: reviews.length,
    overdueReviews,
    latestActivity,
    latestSimulation,
    signalCount: signals.length,
    severity
  };
}

async function getDifficultyItemsForStudents(studentIds: string[]) {
  if (studentIds.length === 0) {
    return [];
  }

  const [exerciseAttempts, simulationAnswers] = await Promise.all([
    prisma.exerciseAttempt.findMany({
      where: {
        userId: {
          in: studentIds
        }
      },
      include: {
        exercise: {
          include: {
            skill: true,
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
    }),
    prisma.simulationAnswer.findMany({
      where: {
        attempt: {
          userId: {
            in: studentIds
          }
        }
      },
      include: {
        exercise: {
          include: {
            skill: true,
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
    })
  ]);

  const answers: DifficultyAnswerInput[] = [...exerciseAttempts, ...simulationAnswers].map((answer) => {
    const mission = answer.exercise.mission;
    const trackModule = mission.module;
    const track = trackModule.track;

    return {
      isCorrect: answer.isCorrect,
      skillSlug: answer.exercise.skill?.slug,
      skillName: answer.exercise.skill?.name,
      fallbackKey: `${track.slug}/${trackModule.slug}/${mission.slug}`,
      fallbackLabel: `${track.title} · ${trackModule.title} · ${mission.title}`
    };
  });

  return aggregateDifficultyItems(answers).slice(0, 8);
}

export async function getTutorDashboard(teacherId: string) {
  const teacherClassIds = await getTeacherClassIds(teacherId);

  const classes = await prisma.classGroup.findMany({
    where: {
      id: {
        in: teacherClassIds
      }
    },
    include: {
      memberships: {
        where: {
          roleInClass: "STUDENT"
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      },
      signals: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const studentIds = Array.from(
    new Set(classes.flatMap((classGroup) => classGroup.memberships.map((membership) => membership.userId)))
  );
  const studentSummaries = (
    await Promise.all(studentIds.map((studentId) => getStudentSummary(studentId)))
  ).filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));
  const now = new Date();
  const activeStudents = studentSummaries.filter((summary) => {
    if (!summary.user.lastLoginAt) {
      return false;
    }

    return now.getTime() - summary.user.lastLoginAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const attentionStudents = studentSummaries.filter((summary) => summary.severity === "ATTENTION").length;
  const highRiskStudents = studentSummaries.filter((summary) => summary.severity === "HIGH_RISK").length;
  const averageProgress = calculateAverageProgress(
    studentSummaries.map((summary) => ({
      completed: summary.progressPercent,
      total: 100
    }))
  );
  const overdueReviews = studentSummaries.reduce((total, summary) => total + summary.overdueReviews, 0);
  const latestSimulations = await prisma.simulationAttempt.findMany({
    where: {
      userId: {
        in: studentIds
      }
    },
    include: {
      user: true,
      simulation: true
    },
    orderBy: {
      finishedAt: "desc"
    },
    take: 6
  });
  const difficultyItems = await getDifficultyItemsForStudents(studentIds);
  const recentSignals = await prisma.engagementSignal.findMany({
    where: {
      classGroupId: {
        in: teacherClassIds
      }
    },
    include: {
      user: true,
      classGroup: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 8
  });

  return {
    classes,
    studentSummaries,
    studentCount: studentSummaries.length,
    activeStudents,
    attentionStudents,
    highRiskStudents,
    averageProgress,
    overdueReviews,
    latestSimulations,
    difficultyItems,
    recentSignals
  };
}

export async function getTutorClasses(teacherId: string) {
  const dashboard = await getTutorDashboard(teacherId);

  return Promise.all(
    dashboard.classes.map(async (classGroup) => {
      const studentIds = classGroup.memberships.map((membership) => membership.userId);
      const summaries = dashboard.studentSummaries.filter((summary) => studentIds.includes(summary.user.id));
      const averageProgress = calculateAverageProgress(
        summaries.map((summary) => ({
          completed: summary.progressPercent,
          total: 100
        }))
      );

      return {
        classGroup,
        studentCount: summaries.length,
        averageProgress,
        attentionSignals: classGroup.signals.filter((signal) => signal.severity === "ATTENTION").length,
        highRiskSignals: classGroup.signals.filter((signal) => signal.severity === "HIGH_RISK").length,
        overdueReviews: summaries.reduce((total, summary) => total + summary.overdueReviews, 0)
      };
    })
  );
}

export async function getTutorClassDetail(teacherId: string, classGroupId: string) {
  const teacherClassIds = await getTeacherClassIds(teacherId);

  if (!teacherClassIds.includes(classGroupId)) {
    return null;
  }

  const classGroup = await prisma.classGroup.findUnique({
    where: {
      id: classGroupId
    },
    include: {
      memberships: {
        where: {
          roleInClass: "STUDENT"
        },
        include: {
          user: {
            include: {
              profile: true
            }
          }
        }
      },
      signals: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!classGroup) {
    return null;
  }

  const studentSummaries = (
    await Promise.all(
      classGroup.memberships.map((membership) => getStudentSummary(membership.userId, classGroupId))
    )
  ).filter((summary): summary is NonNullable<typeof summary> => Boolean(summary));
  const difficultyItems = await getDifficultyItemsForStudents(studentSummaries.map((summary) => summary.user.id));
  const averageProgress = calculateAverageProgress(
    studentSummaries.map((summary) => ({
      completed: summary.progressPercent,
      total: 100
    }))
  );

  return {
    classGroup,
    studentSummaries,
    difficultyItems,
    averageProgress,
    overdueReviews: studentSummaries.reduce((total, summary) => total + summary.overdueReviews, 0)
  };
}

export async function getTutorStudentDetail(teacherId: string, studentId: string) {
  const canAccess = await assertTeacherCanAccessStudent(teacherId, studentId);

  if (!canAccess) {
    return null;
  }

  const [summary, reviews, exerciseAttempts, simulationAttempts, signals, activityLogs, notes, difficulties] =
    await Promise.all([
      getStudentSummary(studentId),
      prisma.reviewSchedule.findMany({
        where: {
          userId: studentId,
          status: {
            in: ["PENDING", "OVERDUE"]
          }
        },
        include: {
          skill: true,
          mission: {
            include: {
              module: {
                include: {
                  track: true
                }
              }
            }
          }
        },
        orderBy: {
          dueAt: "asc"
        }
      }),
      prisma.exerciseAttempt.findMany({
        where: {
          userId: studentId
        },
        include: {
          exercise: {
            include: {
              skill: true,
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
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 12
      }),
      prisma.simulationAttempt.findMany({
        where: {
          userId: studentId
        },
        include: {
          simulation: true
        },
        orderBy: {
          finishedAt: "desc"
        },
        take: 8
      }),
      prisma.engagementSignal.findMany({
        where: {
          userId: studentId
        },
        include: {
          classGroup: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      prisma.activityLog.findMany({
        where: {
          userId: studentId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 12
      }),
      prisma.teacherNote.findMany({
        where: {
          studentId
        },
        include: {
          teacher: true
        },
        orderBy: {
          createdAt: "desc"
        }
      }),
      getDifficultyItemsForStudents([studentId])
    ]);

  if (!summary) {
    return null;
  }

  return {
    summary,
    reviews,
    exerciseAttempts,
    simulationAttempts,
    signals,
    activityLogs,
    notes,
    difficulties
  };
}

export async function teacherCanAccessStudent(teacherId: string, studentId: string) {
  return assertTeacherCanAccessStudent(teacherId, studentId);
}

/// ---------------------------------------------------------------------------
/// Painel do professor
///
/// Uma consulta só monta as quatro abas. Em vez de repetir `getStudentSummary`
/// por aluno (que faz seis idas ao banco cada), aqui as tabelas vêm inteiras
/// uma vez e o cruzamento acontece em memória — a turma toda cabe num punhado
/// de mapas.

export type TeacherPanelStatus = "ok" | "atencao" | "risco";

export type TeacherPanelClass = {
  id: string;
  name: string;
  course: string;
  term: string;
  students: number;
};

export type TeacherPanelStudent = {
  id: string;
  name: string;
  classGroupId: string | null;
  className: string;
  progressPercent: number;
  simulationsDone: number;
  simulationAverage: number | null;
  overdueReviews: number;
  /** Dias desde o último acesso; `null` quando a conta nunca entrou. */
  inactiveDays: number | null;
  lastAccess: string;
  status: TeacherPanelStatus;
  reason: string;
  following: boolean;
};

export type TeacherPanelModule = {
  id: string;
  title: string;
  description: string;
  trackId: string;
  trackTitle: string;
  missions: number;
  exercises: number;
  published: boolean;
  /** Conclusão por aluno matriculado na trilha, para a média seguir o filtro de turma. */
  progress: Array<{ studentId: string; percent: number }>;
};

export type TeacherPanelSimulation = {
  id: string;
  title: string;
  questions: number;
  attempts: Array<{ studentId: string; score: number; finishedAt: string }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function severityToStatus(severity: EngagementSeverity): TeacherPanelStatus {
  if (severity === "HIGH_RISK") {
    return "risco";
  }

  return severity === "ATTENTION" ? "atencao" : "ok";
}

export async function getTeacherPanel(teacherId: string) {
  const teacherClassIds = await getTeacherClassIds(teacherId);

  const classGroups = await prisma.classGroup.findMany({
    where: { id: { in: teacherClassIds } },
    include: {
      memberships: {
        where: { roleInClass: "STUDENT" },
        include: { user: { select: { id: true, name: true, lastLoginAt: true } } }
      }
    },
    orderBy: { name: "asc" }
  });

  const studentIds = Array.from(
    new Set(classGroups.flatMap((group) => group.memberships.map((membership) => membership.userId)))
  );

  const [modules, missions, progresses, reviews, signals, simulations, attempts, follows, enrollments, tracks] =
    await Promise.all([
      prisma.module.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          trackId: true,
          approvalStatus: true,
          track: { select: { title: true } }
        },
        orderBy: [{ track: { title: "asc" } }, { order: "asc" }]
      }),
      prisma.mission.findMany({
        select: { id: true, moduleId: true, _count: { select: { exercises: true } } }
      }),
      prisma.missionProgress.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, missionId: true, status: true, masteryStatus: true }
      }),
      prisma.reviewSchedule.findMany({
        where: { userId: { in: studentIds }, status: { in: ["PENDING", "OVERDUE"] } },
        select: { userId: true, status: true, dueAt: true }
      }),
      prisma.engagementSignal.findMany({
        where: { userId: { in: studentIds }, resolvedAt: null },
        select: { userId: true, severity: true, message: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.simulation.findMany({
        select: { id: true, title: true, _count: { select: { questions: true } } },
        orderBy: { createdAt: "asc" }
      }),
      prisma.simulationAttempt.findMany({
        where: { userId: { in: studentIds }, finishedAt: { not: null } },
        select: { userId: true, simulationId: true, score: true, finishedAt: true },
        orderBy: { finishedAt: "desc" }
      }),
      prisma.studentFollow.findMany({ where: { teacherId }, select: { studentId: true } }),
      prisma.enrollment.findMany({
        where: { userId: { in: studentIds }, status: "ACTIVE" },
        select: { userId: true, trackId: true }
      }),
      prisma.track.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } })
    ]);

  const now = new Date();
  const followed = new Set(follows.map((follow) => follow.studentId));
  const completedMissions = new Set(
    progresses
      .filter((progress) => isMissionCompleted(progress.status, progress.masteryStatus))
      .map((progress) => `${progress.userId}:${progress.missionId}`)
  );

  const missionsByModule = new Map<string, string[]>();
  const exercisesByModule = new Map<string, number>();

  for (const mission of missions) {
    const list = missionsByModule.get(mission.moduleId) ?? [];
    list.push(mission.id);
    missionsByModule.set(mission.moduleId, list);
    exercisesByModule.set(
      mission.moduleId,
      (exercisesByModule.get(mission.moduleId) ?? 0) + mission._count.exercises
    );
  }

  /// Só o módulo publicado entra na conta de progresso — é o mesmo recorte que
  /// o aluno enxerga na trilha.
  const publishedMissionsByTrack = new Map<string, string[]>();

  for (const item of modules) {
    if (item.approvalStatus !== "APPROVED") {
      continue;
    }

    const list = publishedMissionsByTrack.get(item.trackId) ?? [];
    list.push(...(missionsByModule.get(item.id) ?? []));
    publishedMissionsByTrack.set(item.trackId, list);
  }

  const tracksByStudent = new Map<string, string[]>();

  for (const enrollment of enrollments) {
    const list = tracksByStudent.get(enrollment.userId) ?? [];
    list.push(enrollment.trackId);
    tracksByStudent.set(enrollment.userId, list);
  }

  const overdueByStudent = new Map<string, number>();

  for (const review of reviews) {
    if (isReviewOverdue(review, now)) {
      overdueByStudent.set(review.userId, (overdueByStudent.get(review.userId) ?? 0) + 1);
    }
  }

  const signalsByStudent = new Map<string, typeof signals>();

  for (const signal of signals) {
    const list = signalsByStudent.get(signal.userId) ?? [];
    list.push(signal);
    signalsByStudent.set(signal.userId, list);
  }

  /// Melhor nota de cada aluno em cada simulado: repetir a prova não conta duas
  /// vezes na média nem na participação.
  const bestScores = new Map<string, number>();

  for (const attempt of attempts) {
    const key = `${attempt.userId}:${attempt.simulationId}`;
    bestScores.set(key, Math.max(bestScores.get(key) ?? 0, attempt.score));
  }

  const simulationsByStudent = new Map<string, number[]>();

  for (const [key, score] of bestScores) {
    const [userId] = key.split(":");
    const list = simulationsByStudent.get(userId) ?? [];
    list.push(score);
    simulationsByStudent.set(userId, list);
  }

  const classByStudent = new Map<string, { id: string; name: string }>();

  for (const group of classGroups) {
    for (const membership of group.memberships) {
      if (!classByStudent.has(membership.userId)) {
        classByStudent.set(membership.userId, { id: group.id, name: group.name });
      }
    }
  }

  const students: TeacherPanelStudent[] = classGroups
    .flatMap((group) => group.memberships.map((membership) => membership.user))
    // Aluno em duas turmas do mesmo professor aparece uma vez só.
    .filter((user, index, list) => list.findIndex((item) => item.id === user.id) === index)
    .map((user) => {
      const trackIds = tracksByStudent.get(user.id) ?? [];
      const progressPercent = calculateAverageProgress(
        trackIds.map((trackId) => {
          const trackMissions = publishedMissionsByTrack.get(trackId) ?? [];

          return {
            completed: trackMissions.filter((missionId) => completedMissions.has(`${user.id}:${missionId}`)).length,
            total: trackMissions.length
          };
        })
      );
      const overdueReviews = overdueByStudent.get(user.id) ?? 0;
      const studentSignals = signalsByStudent.get(user.id) ?? [];
      const inactiveDays = user.lastLoginAt
        ? Math.floor((now.getTime() - user.lastLoginAt.getTime()) / DAY_MS)
        : null;
      const severity = getHighestEngagementSeverity([
        getHighestEngagementSeverity(studentSignals.map((signal) => signal.severity)),
        overdueReviews > 0 ? "ATTENTION" : "NORMAL",
        inactiveDays !== null && inactiveDays >= 14 ? "HIGH_RISK" : "NORMAL"
      ]);
      const scores = simulationsByStudent.get(user.id) ?? [];
      const simulationAverage = scores.length
        ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
        : null;
      const classGroup = classByStudent.get(user.id) ?? null;

      return {
        id: user.id,
        name: user.name,
        classGroupId: classGroup?.id ?? null,
        className: classGroup?.name ?? "Sem turma",
        progressPercent,
        simulationsDone: scores.length,
        simulationAverage,
        overdueReviews,
        inactiveDays,
        lastAccess: user.lastLoginAt ? formatRelativeDay(user.lastLoginAt, now) : "Nunca",
        status: severityToStatus(severity),
        reason: buildAttentionReason({
          signalMessage: studentSignals[0]?.message,
          inactiveDays,
          overdueReviews,
          progressPercent,
          simulationAverage
        }),
        following: followed.has(user.id)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const moduleRows: TeacherPanelModule[] = modules.map((item) => {
    const moduleMissions = missionsByModule.get(item.id) ?? [];
    const enrolled = students.filter((student) => (tracksByStudent.get(student.id) ?? []).includes(item.trackId));

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      trackId: item.trackId,
      trackTitle: item.track.title,
      missions: moduleMissions.length,
      exercises: exercisesByModule.get(item.id) ?? 0,
      published: item.approvalStatus === "APPROVED",
      progress: enrolled.map((student) => ({
        studentId: student.id,
        percent: calculateTrackProgressPercent(
          moduleMissions.filter((missionId) => completedMissions.has(`${student.id}:${missionId}`)).length,
          moduleMissions.length
        )
      }))
    };
  });

  const attemptsBySimulation = new Map<string, TeacherPanelSimulation["attempts"]>();

  for (const attempt of attempts) {
    const list = attemptsBySimulation.get(attempt.simulationId) ?? [];
    list.push({
      studentId: attempt.userId,
      score: attempt.score,
      finishedAt: (attempt.finishedAt ?? now).toISOString()
    });
    attemptsBySimulation.set(attempt.simulationId, list);
  }

  const simulationRows: TeacherPanelSimulation[] = simulations.map((simulation) => ({
    id: simulation.id,
    title: simulation.title,
    questions: simulation._count.questions,
    attempts: attemptsBySimulation.get(simulation.id) ?? []
  }));

  return {
    classes: classGroups.map<TeacherPanelClass>((group) => ({
      id: group.id,
      name: group.name,
      course: group.course || group.description,
      term: group.term || "—",
      students: group.memberships.length
    })),
    students,
    modules: moduleRows,
    simulations: simulationRows,
    simulationTotal: simulations.length,
    tracks
  };
}

export type TeacherPanel = Awaited<ReturnType<typeof getTeacherPanel>>;
