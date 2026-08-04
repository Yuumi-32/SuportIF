import { prisma } from "@/lib/prisma/client";
import { isMissionCompleted } from "@/lib/progress/mission";
import { calculateTrackProgressPercent } from "@/lib/progress/track";
import {
  aggregateDifficultyItems,
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
