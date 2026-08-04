import { prisma } from "@/lib/prisma/client";
import {
  applyElapsedTime,
  getPetMood,
  getPetMoodMessage,
  getWellbeing,
  type PetMood,
  type PetState,
  type PetStats,
  type StudySignals
} from "@/lib/pet/state";

export type PetOverview = {
  name: string;
  stats: PetStats;
  wellbeing: number;
  mood: PetMood;
  moodMessage: string;
  signals: StudySignals;
  /** Quantos petiscos ele já ganhou hoje. É informação, não limite. */
  treatsToday: number;
  /** O cliente precisa dos horários para desenhar o tempo de espera de cada ação. */
  lastFedAt: Date | null;
  lastPlayedAt: Date | null;
  lastPettedAt: Date | null;
  /** Instante em que os medidores acima valem. Serve de base para o relógio do cliente. */
  now: Date;
};

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Cria o pet na primeira visita.
 *
 * Leitura primeiro, de propósito: isto roda em toda tela protegida por causa do
 * Nero que passeia, e um upsert gravaria no banco a cada carregamento de página
 * só para não fazer nada. O catch cobre duas abas abrindo ao mesmo tempo.
 */
export async function ensurePet(userId: string) {
  const existing = await prisma.pet.findUnique({ where: { userId } });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.pet.create({ data: { userId } });
  } catch {
    return prisma.pet.findUniqueOrThrow({ where: { userId } });
  }
}

/**
 * Tudo que o pet sabe sobre o estudo de hoje. É a leitura que transforma
 * progresso real em humor e em petiscos.
 */
export async function getStudySignals(userId: string, now: Date): Promise<StudySignals> {
  const dayStart = startOfDay(now);

  const [profile, missionsToday, reviewsToday, simulationsToday, overdueReviews] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { streak: true, level: true }
    }),
    prisma.missionProgress.count({
      where: { userId, completedAt: { gte: dayStart } }
    }),
    prisma.reviewSchedule.count({
      where: { userId, completedAt: { gte: dayStart } }
    }),
    prisma.simulationAttempt.count({
      where: { userId, finishedAt: { gte: dayStart } }
    }),
    prisma.reviewSchedule.count({
      where: {
        userId,
        OR: [{ status: "OVERDUE" }, { status: "PENDING", dueAt: { lt: dayStart } }]
      }
    })
  ]);

  return {
    streak: profile?.streak ?? 0,
    level: profile?.level ?? 1,
    activitiesToday: missionsToday + reviewsToday + simulationsToday,
    overdueReviews
  };
}

/** Quantos petiscos ele já ganhou hoje — o contador zera na virada do dia. */
export function getTreatsUsedToday(pet: { treatsDateKey: string; treatsUsed: number }, now: Date) {
  return pet.treatsDateKey === toDateKey(now) ? pet.treatsUsed : 0;
}

export function buildPetOverview(
  pet: {
    name: string;
    satiety: number;
    energy: number;
    affection: number;
    syncedAt: Date;
    lastFedAt: Date | null;
    lastPlayedAt: Date | null;
    lastPettedAt: Date | null;
    treatsDateKey: string;
    treatsUsed: number;
  },
  signals: StudySignals,
  now: Date
): PetOverview {
  const state: PetState = {
    satiety: pet.satiety,
    energy: pet.energy,
    affection: pet.affection,
    syncedAt: pet.syncedAt,
    lastFedAt: pet.lastFedAt,
    lastPlayedAt: pet.lastPlayedAt,
    lastPettedAt: pet.lastPettedAt
  };

  const stats = applyElapsedTime(state, now, signals.streak);
  const mood = getPetMood(stats, signals);

  return {
    name: pet.name,
    stats,
    wellbeing: getWellbeing(stats),
    mood,
    moodMessage: getPetMoodMessage(mood, pet.name, signals),
    signals,
    treatsToday: getTreatsUsedToday(pet, now),
    lastFedAt: pet.lastFedAt,
    lastPlayedAt: pet.lastPlayedAt,
    lastPettedAt: pet.lastPettedAt,
    now
  };
}

export async function getPetOverview(userId: string, now = new Date()): Promise<PetOverview> {
  const [pet, signals] = await Promise.all([ensurePet(userId), getStudySignals(userId, now)]);

  return buildPetOverview(pet, signals, now);
}
