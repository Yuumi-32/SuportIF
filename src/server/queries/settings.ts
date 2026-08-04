import { prisma } from "@/lib/prisma/client";

/** Números mostrados na aba "Conta" da página de configuração. */
export async function getSettingsOverview(userId: string) {
  const now = new Date();

  const [activeSessionCount, completedMissionCount, noteCount, eventCount] = await Promise.all([
    prisma.session.count({
      where: {
        userId,
        expiresAt: { gt: now }
      }
    }),
    prisma.missionProgress.count({
      where: {
        userId,
        completedAt: { not: null }
      }
    }),
    prisma.studyNote.count({ where: { userId } }),
    prisma.calendarEvent.count({ where: { userId } })
  ]);

  return { activeSessionCount, completedMissionCount, noteCount, eventCount };
}
