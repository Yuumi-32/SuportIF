import type { ClassLevel, ModuleApprovalStatus, UserRole } from "@prisma/client";

import { formatAdminAction, formatTeacherName } from "@/lib/admin/presentation";
import { formatRelativeDay, startOfDay } from "@/lib/format/relative-date";
import { prisma } from "@/lib/prisma/client";

/// A configuração da instituição é uma linha só. O id é fixo para o painel
/// nunca precisar descobrir qual das linhas é a "certa".
export const INSTITUTION_ID = "institution";

/// Espelha os `@default` do modelo: enquanto ninguém salvar nada, ler a
/// configuração não escreve no banco.
const institutionDefaults = {
  id: INSTITUTION_ID,
  name: "Instituto Federal — Campus Demonstrativo",
  emailDomain: "",
  primaryColor: "violeta",
  openRegistration: true,
  requireInstitutionalEmail: false
};

export type InstitutionSettingsView = typeof institutionDefaults;

export async function getInstitutionSettings(): Promise<InstitutionSettingsView> {
  const saved = await prisma.institutionSettings.findUnique({ where: { id: INSTITUTION_ID } });

  if (!saved) {
    return institutionDefaults;
  }

  return {
    id: saved.id,
    name: saved.name,
    emailDomain: saved.emailDomain,
    primaryColor: saved.primaryColor,
    openRegistration: saved.openRegistration,
    requireInstitutionalEmail: saved.requireInstitutionalEmail
  };
}

/// Quantos dias de atividade o painel carrega. É o maior período do filtro
/// (semestre); 7 e 30 dias são recortes deste mesmo vetor.
const ACTIVITY_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AdminActivityDay = { date: string; label: string; events: number; users: number };

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastAccess: string;
  suspended: boolean;
};

export type AdminClassRow = {
  id: string;
  name: string;
  course: string;
  term: string;
  level: ClassLevel;
  teachers: string;
  students: number;
  progressPercent: number;
};

export type AdminContentRow = {
  id: string;
  title: string;
  trackTitle: string;
  missions: number;
  status: ModuleApprovalStatus;
  meta: string;
};

export type AdminLogRow = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  when: string;
};

/**
 * Tudo o que o painel do admin mostra, numa consulta só.
 *
 * A atividade vem por dia e crua: quem recorta em 7 dias, 30 dias ou semestre é
 * o painel, então trocar o filtro não volta ao servidor.
 */
export async function getAdminOverview() {
  const now = new Date();
  const activitySince = new Date(startOfDay(now).getTime() - (ACTIVITY_DAYS - 1) * DAY_MS);
  const moduleCard = {
    track: { select: { title: true } },
    createdBy: { select: { name: true } },
    _count: { select: { missions: true } }
  };

  const [
    institution,
    roleGroups,
    userTotal,
    users,
    activityRows,
    classGroups,
    teachers,
    queueModules,
    reviewedModules,
    logs,
    totalMissions,
    suspended,
    overdueReviews,
    riskSignals,
    counts
  ] = await Promise.all([
    getInstitutionSettings(),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }],
      take: 200,
      select: { id: true, name: true, email: true, role: true, lastLoginAt: true, suspendedAt: true }
    }),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: activitySince } },
      select: { createdAt: true, userId: true }
    }),
    prisma.classGroup.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    }),
    prisma.user.findMany({
      where: { role: "TEACHER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.module.findMany({
      where: { approvalStatus: { not: "APPROVED" } },
      orderBy: [{ approvalStatus: "asc" }, { createdAt: "desc" }],
      take: 15,
      include: moduleCard
    }),
    prisma.module.findMany({
      where: { approvalStatus: "APPROVED" },
      orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }],
      take: 4,
      include: moduleCard
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { user: { select: { name: true } } }
    }),
    prisma.mission.count({ where: { module: { approvalStatus: "APPROVED" } } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.reviewSchedule.count({
      where: { OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: now } }] }
    }),
    prisma.engagementSignal.count({ where: { severity: "HIGH_RISK", resolvedAt: null } }),
    Promise.all([
      prisma.track.count(),
      prisma.module.count(),
      prisma.mission.count(),
      prisma.exercise.count(),
      prisma.simulation.count(),
      prisma.badge.count()
    ])
  ]);

  const [tracks, modules, missions, exercises, simulations, badges] = counts;

  // Atividade por dia. O vetor precisa ter todos os dias, inclusive os vazios —
  // são eles que viram barra rasa no gráfico.
  const perDay = new Map<string, { events: number; users: Set<string> }>();
  activityRows.forEach((row) => {
    const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
    const bucket = perDay.get(key) ?? { events: 0, users: new Set<string>() };
    bucket.events += 1;
    bucket.users.add(row.userId);
    perDay.set(key, bucket);
  });

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const activity: AdminActivityDay[] = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const date = new Date(activitySince.getTime() + index * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    const bucket = perDay.get(key);

    return {
      date: key,
      label: weekdays[date.getDay()],
      events: bucket?.events ?? 0,
      users: bucket?.users.size ?? 0
    };
  });

  const activeUsers = (days: number) => {
    const cut = startOfDay(now).getTime() - (days - 1) * DAY_MS;
    const ids = new Set<string>();
    activityRows.forEach((row) => {
      if (row.createdAt.getTime() >= cut) {
        ids.add(row.userId);
      }
    });
    return ids.size;
  };

  const studentIds = Array.from(
    new Set(
      classGroups.flatMap((group) =>
        group.memberships.filter((member) => member.roleInClass === "STUDENT").map((member) => member.userId)
      )
    )
  );

  // Missões concluídas por aluno, na mesma régua que o app usa para dizer que
  // uma missão está fechada (ver isMissionCompleted).
  const completedRows = studentIds.length
    ? await prisma.missionProgress.groupBy({
        by: ["userId"],
        where: {
          userId: { in: studentIds },
          mission: { module: { approvalStatus: "APPROVED" } },
          OR: [{ status: "COMPLETED" }, { masteryStatus: { in: ["PROFICIENT", "MASTERED"] } }]
        },
        _count: { _all: true }
      })
    : [];
  const completedByUser = new Map(completedRows.map((row) => [row.userId, row._count._all]));

  const classes: AdminClassRow[] = classGroups.map((group) => {
    const students = group.memberships.filter((member) => member.roleInClass === "STUDENT");
    const teacherNames = group.memberships
      .filter((member) => member.roleInClass === "TEACHER")
      .map((member) => formatTeacherName(member.user.name));
    const percentSum = students.reduce((total, member) => {
      if (totalMissions === 0) {
        return total;
      }

      return total + Math.min(100, ((completedByUser.get(member.userId) ?? 0) / totalMissions) * 100);
    }, 0);

    return {
      id: group.id,
      name: group.name,
      course: group.course || group.description,
      term: group.term || "—",
      level: group.level,
      teachers: teacherNames.length ? teacherNames.join(", ") : "Sem professor",
      students: students.length,
      progressPercent: students.length ? Math.round(percentSum / students.length) : 0
    };
  });

  const toContentRow = (item: (typeof queueModules)[number]): AdminContentRow => ({
    id: item.id,
    title: item.title,
    trackTitle: item.track.title,
    missions: item._count.missions,
    status: item.approvalStatus,
    meta: [
      item.track.title,
      `${item._count.missions} ${item._count.missions === 1 ? "missão" : "missões"}`,
      item.createdBy ? `por ${item.createdBy.name}` : null,
      `criado ${formatRelativeDay(item.createdAt, now).toLowerCase()}`
    ]
      .filter(Boolean)
      .join(" · ")
  });

  return {
    institution,
    totals: {
      users: userTotal,
      students: roleGroups.find((group) => group.role === "STUDENT")?._count._all ?? 0,
      teachers: roleGroups.find((group) => group.role === "TEACHER")?._count._all ?? 0,
      admins: roleGroups.find((group) => group.role === "ADMIN")?._count._all ?? 0,
      classes: classGroups.length,
      tracks,
      modules,
      missions,
      exercises,
      simulations,
      badges
    },
    activity,
    activeUsers: { "7d": activeUsers(7), "30d": activeUsers(30), sem: activeUsers(ACTIVITY_DAYS) },
    users: users.map<AdminUserRow>((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastAccess: user.lastLoginAt ? formatRelativeDay(user.lastLoginAt, now) : "Nunca",
      suspended: Boolean(user.suspendedAt)
    })),
    userTotal,
    classes,
    teachers,
    content: [...queueModules, ...reviewedModules].map(toContentRow),
    pendingContent: queueModules.filter((item) => item.approvalStatus === "PENDING").length,
    logs: logs.map<AdminLogRow>((log) => ({
      id: log.id,
      actor: log.user.name,
      action: formatAdminAction(log.action, log.entityType),
      entityType: log.entityType,
      when: formatRelativeDay(log.createdAt, now)
    })),
    platform: { suspended, overdueReviews, riskSignals }
  };
}

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;

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
