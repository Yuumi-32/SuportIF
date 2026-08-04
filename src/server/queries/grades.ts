import { prisma } from "@/lib/prisma/client";
import { toDayKey, type AnswerEvent, type StudyEvent } from "@/lib/grades/performance";
import { isMissionCompleted } from "@/lib/progress/mission";

/// Dados brutos da página "Notas".
///
/// A consulta devolve os eventos já reduzidos a `dayKey` + `hour` (calculados
/// aqui, no servidor) porque a página filtra por período no cliente. Assim o
/// aluno troca entre "Todos / 30d / 7d" sem nova ida ao banco e sem risco de o
/// fuso do navegador mudar o dia de cada evento.

/** Janela máxima de histórico carregada para o mapa de atividade. */
const HISTORY_DAYS = 365;

export type SimulationGrade = {
  id: string;
  simulationId: string;
  title: string;
  type: string;
  dayKey: string;
  hour: number;
  score: number;
  grade: number;
  correctCount: number;
  wrongCount: number;
  total: number;
};

export type MissionGrade = {
  id: string;
  title: string;
  trackTitle: string;
  moduleTitle: string;
  attemptsCount: number;
  correctCount: number;
  accuracy: number;
  masteryStatus: string;
  completed: boolean;
  lastStudiedDayKey: string | null;
};

export type StudentGrades = {
  todayKey: string;
  progress: { level: number; totalXp: number; streak: number };
  answers: AnswerEvent[];
  studyEvents: StudyEvent[];
  simulations: SimulationGrade[];
  missions: MissionGrade[];
  reviews: { pending: number; overdue: number };
  badgeCount: number;
  missionTotals: { completed: number; total: number };
};

function toEvent(date: Date): StudyEvent {
  return { dayKey: toDayKey(date), hour: date.getHours() };
}

export async function getStudentGrades(userId: string): Promise<StudentGrades> {
  const now = new Date();
  const historyStart = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

  const [
    exerciseAttempts,
    simulationAttempts,
    missionProgresses,
    activityLogs,
    reviews,
    badgeCount,
    profile,
    enrollments
  ] = await Promise.all([
    prisma.exerciseAttempt.findMany({
      where: { userId, createdAt: { gte: historyStart } },
      include: {
        exercise: {
          include: {
            skill: true,
            mission: { include: { module: { include: { track: true } } } }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.simulationAttempt.findMany({
      where: { userId, startedAt: { gte: historyStart } },
      include: {
        simulation: true,
        answers: {
          include: {
            exercise: {
              include: {
                skill: true,
                mission: { include: { module: { include: { track: true } } } }
              }
            }
          }
        }
      },
      orderBy: { startedAt: "desc" }
    }),
    prisma.missionProgress.findMany({
      where: { userId },
      include: { mission: { include: { module: { include: { track: true } } } } },
      orderBy: { lastStudiedAt: "desc" }
    }),
    prisma.activityLog.findMany({
      where: { userId, createdAt: { gte: historyStart } },
      select: { createdAt: true }
    }),
    prisma.reviewSchedule.findMany({
      where: { userId, status: { in: ["PENDING", "OVERDUE"] } },
      select: { status: true, dueAt: true }
    }),
    prisma.userBadge.count({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.enrollment.findMany({
      where: { userId },
      select: { track: { select: { modules: { select: { _count: { select: { missions: true } } } } } } }
    })
  ]);

  const answers: AnswerEvent[] = [];

  for (const attempt of exerciseAttempts) {
    const mission = attempt.exercise.mission;
    const event = toEvent(attempt.createdAt);

    answers.push({
      ...event,
      isCorrect: attempt.isCorrect,
      source: "EXERCICIO",
      skillKey: attempt.exercise.skill?.slug ?? mission.module.track.slug,
      skillLabel: attempt.exercise.skill?.name ?? mission.module.track.title,
      missionId: mission.id,
      missionTitle: mission.title
    });
  }

  const simulations: SimulationGrade[] = simulationAttempts.map((attempt) => {
    const reference = attempt.finishedAt ?? attempt.startedAt;
    const event = toEvent(reference);

    for (const answer of attempt.answers) {
      const mission = answer.exercise.mission;

      answers.push({
        ...event,
        isCorrect: answer.isCorrect,
        source: "SIMULADO",
        skillKey: answer.exercise.skill?.slug ?? mission.module.track.slug,
        skillLabel: answer.exercise.skill?.name ?? mission.module.track.title,
        missionId: mission.id,
        missionTitle: mission.title
      });
    }

    return {
      id: attempt.id,
      simulationId: attempt.simulationId,
      title: attempt.simulation.title,
      type: attempt.simulation.type,
      dayKey: event.dayKey,
      hour: event.hour,
      score: attempt.score,
      grade: Math.round(attempt.score) / 10,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      total: attempt.correctCount + attempt.wrongCount
    };
  });

  const missions: MissionGrade[] = missionProgresses.map((progress) => ({
    id: progress.missionId,
    title: progress.mission.title,
    trackTitle: progress.mission.module.track.title,
    moduleTitle: progress.mission.module.title,
    attemptsCount: progress.attemptsCount,
    correctCount: progress.correctCount,
    accuracy:
      progress.attemptsCount === 0
        ? 0
        : Math.round((progress.correctCount / progress.attemptsCount) * 100),
    masteryStatus: progress.masteryStatus,
    completed: isMissionCompleted(progress.status, progress.masteryStatus),
    lastStudiedDayKey: progress.lastStudiedAt ? toDayKey(progress.lastStudiedAt) : null
  }));

  const studyEvents: StudyEvent[] = [
    ...activityLogs.map((log) => toEvent(log.createdAt)),
    ...exerciseAttempts.map((attempt) => toEvent(attempt.createdAt)),
    ...simulationAttempts.map((attempt) => toEvent(attempt.finishedAt ?? attempt.startedAt))
  ];

  const totalMissions = enrollments.reduce(
    (total, enrollment) =>
      total +
      enrollment.track.modules.reduce((moduleTotal, module) => moduleTotal + module._count.missions, 0),
    0
  );

  return {
    todayKey: toDayKey(now),
    progress: {
      level: profile?.level ?? 1,
      totalXp: profile?.totalXp ?? 0,
      streak: profile?.streak ?? 0
    },
    answers,
    studyEvents,
    simulations,
    missions,
    reviews: {
      pending: reviews.length,
      overdue: reviews.filter((review) => review.status === "OVERDUE" || review.dueAt < now).length
    },
    badgeCount,
    missionTotals: {
      completed: missions.filter((mission) => mission.completed).length,
      total: totalMissions
    }
  };
}
