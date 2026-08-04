import { prisma } from "@/lib/prisma/client";

export async function getAdminDashboard() {
  const [users, tracks, modules, missions, exercises, simulations, badges, demoTracks, demoMissions] =
    await Promise.all([
      prisma.user.count(),
      prisma.track.count(),
      prisma.module.count(),
      prisma.mission.count(),
      prisma.exercise.count(),
      prisma.simulation.count(),
      prisma.badge.count(),
      prisma.track.count({ where: { isDemo: true } }),
      prisma.mission.count({ where: { isDemo: true } })
    ]);

  return {
    users,
    tracks,
    modules,
    missions,
    exercises,
    simulations,
    badges,
    demoTracks,
    demoMissions
  };
}

export async function getAdminTracks(editId?: string) {
  const [tracks, editing] = await Promise.all([
    prisma.track.findMany({
      orderBy: [{ title: "asc" }],
      include: {
        _count: {
          select: {
            modules: true
          }
        }
      }
    }),
    editId ? prisma.track.findUnique({ where: { id: editId } }) : null
  ]);

  return { tracks, editing };
}

export async function getAdminModules(editId?: string) {
  const [modules, tracks, editing] = await Promise.all([
    prisma.module.findMany({
      orderBy: [{ track: { title: "asc" } }, { order: "asc" }],
      include: {
        track: true,
        _count: {
          select: {
            missions: true
          }
        }
      }
    }),
    prisma.track.findMany({ orderBy: { title: "asc" } }),
    editId ? prisma.module.findUnique({ where: { id: editId } }) : null
  ]);

  return { modules, tracks, editing };
}

export async function getAdminMissions(editId?: string) {
  const [missions, modules, editing] = await Promise.all([
    prisma.mission.findMany({
      orderBy: [{ module: { track: { title: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
      include: {
        module: {
          include: {
            track: true
          }
        },
        _count: {
          select: {
            exercises: true
          }
        }
      }
    }),
    prisma.module.findMany({
      orderBy: [{ track: { title: "asc" } }, { order: "asc" }],
      include: {
        track: true
      }
    }),
    editId ? prisma.mission.findUnique({ where: { id: editId } }) : null
  ]);

  return { missions, modules, editing };
}

export async function getAdminExercises(editId?: string) {
  const [exercises, missions, skills, editing] = await Promise.all([
    prisma.exercise.findMany({
      orderBy: [{ mission: { module: { track: { title: "asc" } } } }, { mission: { order: "asc" } }, { order: "asc" }],
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
        skill: true,
        _count: {
          select: {
            options: true
          }
        }
      }
    }),
    prisma.mission.findMany({
      orderBy: [{ module: { track: { title: "asc" } } }, { module: { order: "asc" } }, { order: "asc" }],
      include: {
        module: {
          include: {
            track: true
          }
        }
      }
    }),
    prisma.skill.findMany({ orderBy: { name: "asc" } }),
    editId
      ? prisma.exercise.findUnique({
          where: { id: editId },
          include: {
            options: {
              orderBy: { id: "asc" }
            }
          }
        })
      : null
  ]);

  return { exercises, missions, skills, editing };
}

export async function getAdminSimulations(editId?: string) {
  const [simulations, tracks, modules, exercises, editing] = await Promise.all([
    prisma.simulation.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        track: true,
        module: true,
        _count: {
          select: {
            questions: true
          }
        }
      }
    }),
    prisma.track.findMany({ orderBy: { title: "asc" } }),
    prisma.module.findMany({
      orderBy: [{ track: { title: "asc" } }, { order: "asc" }],
      include: {
        track: true
      }
    }),
    prisma.exercise.findMany({
      orderBy: [{ mission: { module: { track: { title: "asc" } } } }, { mission: { order: "asc" } }, { order: "asc" }],
      include: {
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
    }),
    editId
      ? prisma.simulation.findUnique({
          where: { id: editId },
          include: {
            questions: {
              orderBy: { order: "asc" }
            }
          }
        })
      : null
  ]);

  return { simulations, tracks, modules, exercises, editing };
}

export async function getAdminBadges(editId?: string) {
  const [badges, editing] = await Promise.all([
    prisma.badge.findMany({
      orderBy: { title: "asc" },
      include: {
        _count: {
          select: {
            users: true
          }
        }
      }
    }),
    editId ? prisma.badge.findUnique({ where: { id: editId } }) : null
  ]);

  return { badges, editing };
}
