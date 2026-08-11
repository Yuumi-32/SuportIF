import type { MasteryStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { isMissionCompleted } from "@/lib/progress/mission";
import { calculateTrackProgressPercent } from "@/lib/progress/track";

type MissionProgressView = {
  id: string;
  title: string;
  shortDescription: string;
  difficulty: string;
  estimatedMinutes: number;
  order: number;
  xpReward: number;
  guidedExercisePrompt: string;
  exerciseCount: number;
  attemptsCount: number;
  correctCount: number;
  status: string;
  masteryStatus: MasteryStatus;
  completed: boolean;
};

type TrackSource = {
  id: string;
  title: string;
  slug: string;
  description: string;
  area: string;
  level: string;
  coverIcon: string;
  color: string;
  isDemo: boolean;
  modules: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    order: number;
    missions: Array<{
      id: string;
      title: string;
      shortDescription: string;
      difficulty: string;
      estimatedMinutes: number;
      order: number;
      xpReward: number;
      guidedExercisePrompt: string;
      exercises: Array<{ id: string }>;
      progress: Array<{
        status: string;
        masteryStatus: MasteryStatus;
        attemptsCount: number;
        correctCount: number;
      }>;
    }>;
  }>;
};

function buildMissionView(mission: TrackSource["modules"][number]["missions"][number]): MissionProgressView {
  const progress = mission.progress[0];
  const masteryStatus = progress?.masteryStatus ?? "NOT_STARTED";
  const status = progress?.status ?? "NOT_STARTED";

  return {
    id: mission.id,
    title: mission.title,
    shortDescription: mission.shortDescription,
    difficulty: mission.difficulty,
    estimatedMinutes: mission.estimatedMinutes,
    order: mission.order,
    xpReward: mission.xpReward,
    guidedExercisePrompt: mission.guidedExercisePrompt,
    exerciseCount: mission.exercises.length,
    attemptsCount: progress?.attemptsCount ?? 0,
    correctCount: progress?.correctCount ?? 0,
    status,
    masteryStatus,
    completed: isMissionCompleted(status, masteryStatus)
  };
}

function buildTrackSummary(track: TrackSource) {
  const modules = track.modules.map((module) => {
    const missions = module.missions.map(buildMissionView);
    const completedMissions = missions.filter((mission) => mission.completed).length;

    return {
      id: module.id,
      title: module.title,
      slug: module.slug,
      description: module.description,
      order: module.order,
      missions,
      totalMissions: missions.length,
      completedMissions,
      progressPercent: calculateTrackProgressPercent(completedMissions, missions.length)
    };
  });

  const totalMissions = modules.reduce((total, module) => total + module.totalMissions, 0);
  const completedMissions = modules.reduce((total, module) => total + module.completedMissions, 0);
  const nextMission =
    modules.flatMap((module) =>
      module.missions.map((mission) => ({
        ...mission,
        moduleId: module.id,
        moduleTitle: module.title
      }))
    ).find((mission) => !mission.completed) ?? null;

  return {
    id: track.id,
    title: track.title,
    slug: track.slug,
    description: track.description,
    area: track.area,
    level: track.level,
    coverIcon: track.coverIcon,
    color: track.color,
    isDemo: track.isDemo,
    modules,
    totalMissions,
    completedMissions,
    progressPercent: calculateTrackProgressPercent(completedMissions, totalMissions),
    nextMission
  };
}

const trackInclude = (userId: string) => ({
  modules: {
    orderBy: {
      order: "asc" as const
    },
    include: {
      missions: {
        orderBy: {
          order: "asc" as const
        },
        include: {
          exercises: {
            select: {
              id: true
            }
          },
          progress: {
            where: {
              userId
            },
            select: {
              status: true,
              masteryStatus: true,
              attemptsCount: true,
              correctCount: true
            }
          }
        }
      }
    }
  }
});

export async function getStudentDashboard(userId: string) {
  const [enrollments, pendingReviews, recentBadges, simulations, latestSimulationAttempt] =
    await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId,
        status: "ACTIVE"
      },
      include: {
        track: {
          include: trackInclude(userId)
        }
      },
      orderBy: {
        startedAt: "desc"
      }
    }),
    prisma.reviewSchedule.findMany({
      where: {
        userId,
        status: {
          in: ["PENDING", "OVERDUE"]
        }
      },
      include: {
        mission: {
          include: {
            module: {
              include: {
                track: true
              }
            }
          }
        },
        skill: true
      },
      orderBy: {
        dueAt: "asc"
      },
      take: 5
    }),
    prisma.userBadge.findMany({
      where: {
        userId
      },
      include: {
        badge: true
      },
      orderBy: {
        earnedAt: "desc"
      },
      take: 5
    }),
    prisma.simulation.findMany({
      include: {
        questions: {
          select: {
            id: true
          }
        },
        attempts: {
          where: {
            userId
          },
          orderBy: {
            finishedAt: "desc"
          }
        },
        track: true,
        module: true
      },
      orderBy: {
        createdAt: "asc"
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

  const tracks = enrollments.map((enrollment) => ({
    enrollment,
    summary: buildTrackSummary(enrollment.track)
  }));

  const totalMissions = tracks.reduce((total, item) => total + item.summary.totalMissions, 0);
  const completedMissions = tracks.reduce((total, item) => total + item.summary.completedMissions, 0);
  const nextStep =
    tracks
      .map((item) =>
        item.summary.nextMission
          ? {
              trackTitle: item.summary.title,
              trackSlug: item.summary.slug,
              ...item.summary.nextMission
            }
          : null
      )
      .find(Boolean) ?? null;

  // Primeiro exercício da próxima missão: é o que deixa o cartão "Seu Próximo
  // Passo" respondível no painel. Só o texto das alternativas viaja para o
  // cliente — qual delas é a correta fica no servidor.
  const nextStepExercise = nextStep
    ? await prisma.exercise.findFirst({
        where: {
          missionId: nextStep.id,
          type: "MULTIPLE_CHOICE"
        },
        orderBy: {
          order: "asc"
        },
        select: {
          id: true,
          prompt: true,
          options: {
            select: {
              id: true,
              text: true
            },
            orderBy: {
              id: "asc"
            }
          }
        }
      })
    : null;

  return {
    tracks,
    pendingReviews,
    recentBadges,
    simulations,
    recommendedSimulation:
      simulations.find((simulation) => simulation.attempts.length === 0) ?? simulations[0] ?? null,
    latestSimulationAttempt,
    totalMissions,
    completedMissions,
    progressPercent: calculateTrackProgressPercent(completedMissions, totalMissions),
    nextStep,
    nextStepExercise
  };
}

export async function getStudentTracksPage(userId: string) {
  const [enrollments, publicTracks] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId
      },
      include: {
        track: {
          include: trackInclude(userId)
        }
      },
      orderBy: {
        startedAt: "desc"
      }
    }),
    prisma.track.findMany({
      where: {
        isPublic: true
      },
      include: trackInclude(userId),
      orderBy: {
        createdAt: "asc"
      }
    })
  ]);

  const enrolledTrackIds = new Set(enrollments.map((enrollment) => enrollment.trackId));

  return {
    enrolledTracks: enrollments.map((enrollment) => ({
      enrollment,
      summary: buildTrackSummary(enrollment.track)
    })),
    availableTracks: publicTracks
      .filter((track) => !enrolledTrackIds.has(track.id))
      .map((track) => buildTrackSummary(track))
  };
}

export async function getTrackMap(userId: string, slug: string) {
  const track = await prisma.track.findUnique({
    where: {
      slug
    },
    include: trackInclude(userId)
  });

  if (!track) {
    return null;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId: track.id
      }
    }
  });

  return {
    enrollment,
    summary: buildTrackSummary(track)
  };
}

export async function getModuleDetail(userId: string, moduleId: string) {
  const trackModule = await prisma.module.findUnique({
    where: {
      id: moduleId
    },
    include: {
      track: true,
      missions: {
        orderBy: {
          order: "asc"
        },
        include: {
          exercises: {
            select: {
              id: true
            }
          },
          progress: {
            where: {
              userId
            },
            select: {
              status: true,
              masteryStatus: true,
              attemptsCount: true,
              correctCount: true
            }
          }
        }
      }
    }
  });

  if (!trackModule) {
    return null;
  }

  const missions = trackModule.missions.map(buildMissionView);
  const completedMissions = missions.filter((mission) => mission.completed).length;
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId: trackModule.trackId
      }
    }
  });

  return {
    module: {
      id: trackModule.id,
      title: trackModule.title,
      description: trackModule.description,
      order: trackModule.order,
      isDemo: trackModule.isDemo,
      track: trackModule.track
    },
    enrollment,
    missions,
    progressPercent: calculateTrackProgressPercent(completedMissions, missions.length),
    completedMissions,
    totalMissions: missions.length
  };
}

export async function recordMissionStudy(userId: string, missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: {
      id: missionId
    },
    select: {
      id: true,
      module: {
        select: {
          trackId: true
        }
      }
    }
  });

  if (!mission) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.enrollment.upsert({
      where: {
        userId_trackId: {
          userId,
          trackId: mission.module.trackId
        }
      },
      update: {
        status: "ACTIVE"
      },
      create: {
        userId,
        trackId: mission.module.trackId,
        status: "ACTIVE"
      }
    });

    const progress = await tx.missionProgress.findUnique({
      where: {
        userId_missionId: {
          userId,
          missionId
        }
      }
    });

    await tx.missionProgress.upsert({
      where: {
        userId_missionId: {
          userId,
          missionId
        }
      },
      update: {
        status: progress?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        masteryStatus:
          progress?.masteryStatus && progress.masteryStatus !== "NOT_STARTED"
            ? progress.masteryStatus
            : "IN_PROGRESS",
        lastStudiedAt: new Date()
      },
      create: {
        userId,
        missionId,
        status: "IN_PROGRESS",
        masteryStatus: "IN_PROGRESS",
        lastStudiedAt: new Date()
      }
    });

    await tx.activityLog.create({
      data: {
        userId,
        action: "MISSION_OPENED",
        entityType: "MISSION",
        entityId: missionId
      }
    });
  });
}

export async function getMissionDetail(userId: string, missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: {
      id: missionId
    },
    include: {
      module: {
        include: {
          track: true
        }
      },
      skills: {
        include: {
          skill: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      },
      progress: {
        where: {
          userId
        }
      },
      exercises: {
        orderBy: {
          order: "asc"
        },
        include: {
          options: {
            orderBy: {
              id: "asc"
            },
            select: {
              id: true,
              text: true
            }
          },
          attempts: {
            where: {
              userId
            },
            orderBy: {
              createdAt: "desc"
            },
            take: 3,
            select: {
              id: true,
              isCorrect: true,
              feedback: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  if (!mission) {
    return null;
  }

  return mission;
}

export async function getStudentReviews(userId: string) {
  return prisma.reviewSchedule.findMany({
    where: {
      userId,
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
  });
}
