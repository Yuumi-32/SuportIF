import { StudentDashboard, type DashboardReview } from "@/components/dashboard/student-dashboard";
import { pageLayout } from "@/lib/appearance/layout";
import { parseAppearance } from "@/lib/appearance/settings";
import { requireRole } from "@/lib/auth/session";
import {
  formatReviewChip,
  getSimulationDescriptionText,
  getSimulationTypeLabel,
  getSkillDisplayName,
  parseSkillResults
} from "@/lib/simulations/presentation";
import { getStudentDashboard } from "@/server/queries/student";

export const dynamic = "force-dynamic";

export default async function StudentAppPage({
  searchParams
}: {
  searchParams: Promise<{ editar?: string | string[] }>;
}) {
  const user = await requireRole(["STUDENT"]);
  const { editar } = await searchParams;
  const dashboard = await getStudentDashboard(user.id);
  const appearance = parseAppearance(user.profile?.appearance);
  const latestWeakSkills = parseSkillResults(dashboard.latestSimulationAttempt?.weakSkillsJson);

  // A trilha em foco é a primeira com missões pendentes; senão, a primeira ativa.
  const focus =
    dashboard.tracks.find((item) => item.summary.completedMissions < item.summary.totalMissions) ??
    dashboard.tracks[0] ??
    null;

  const reviews: DashboardReview[] = dashboard.pendingReviews.slice(0, 5).map((review) => {
    const due = formatReviewChip(review.dueAt);

    return {
      id: review.id,
      missionId: review.mission.id,
      title: review.mission.title,
      trackLabel: `${review.mission.module.track.title} · ${review.mission.module.title}`,
      dueText: due.text,
      dueTone: due.tone,
      overdue: review.status === "OVERDUE"
    };
  });

  return (
    <StudentDashboard
      name={user.name}
      totalXp={user.profile?.totalXp ?? 0}
      level={user.profile?.level ?? 1}
      progressPercent={dashboard.progressPercent}
      completedMissions={dashboard.completedMissions}
      totalMissions={dashboard.totalMissions}
      pendingReviewCount={dashboard.pendingReviews.length}
      nextStep={
        dashboard.nextStep
          ? {
              missionId: dashboard.nextStep.id,
              title: dashboard.nextStep.title,
              contextLabel: `${dashboard.nextStep.trackTitle} · ${dashboard.nextStep.moduleTitle}`,
              shortDescription: dashboard.nextStep.shortDescription,
              guidedPrompt: dashboard.nextStep.guidedExercisePrompt,
              guidedExercise: dashboard.nextStepExercise
            }
          : null
      }
      badges={dashboard.recentBadges.map((userBadge) => ({
        id: userBadge.id,
        title: userBadge.badge.title,
        subtitle: userBadge.badge.description,
        icon: userBadge.badge.icon
      }))}
      focusTrack={
        focus
          ? {
              title: focus.summary.title,
              slug: focus.summary.slug,
              modules: focus.summary.modules.map((module) => ({
                id: module.id,
                title: module.title,
                order: module.order,
                completedMissions: module.completedMissions,
                totalMissions: module.totalMissions,
                missions: module.missions.map((mission) => ({
                  id: mission.id,
                  title: mission.title,
                  completed: mission.completed,
                  xpReward: mission.xpReward
                }))
              }))
            }
          : null
      }
      tracks={dashboard.tracks.map(({ summary }) => ({
        id: summary.id,
        slug: summary.slug,
        title: summary.title,
        description: summary.description,
        completedMissions: summary.completedMissions,
        totalMissions: summary.totalMissions,
        progressPercent: summary.progressPercent
      }))}
      recommendedSimulation={
        dashboard.recommendedSimulation
          ? {
              id: dashboard.recommendedSimulation.id,
              title: dashboard.recommendedSimulation.title,
              description: getSimulationDescriptionText(dashboard.recommendedSimulation.description),
              typeLabel: getSimulationTypeLabel(dashboard.recommendedSimulation.type)
            }
          : null
      }
      lastAttempt={
        dashboard.latestSimulationAttempt
          ? {
              score: dashboard.latestSimulationAttempt.score,
              correctCount: dashboard.latestSimulationAttempt.correctCount,
              wrongCount: dashboard.latestSimulationAttempt.wrongCount,
              title: dashboard.latestSimulationAttempt.simulation.title
            }
          : null
      }
      weakSkills={latestWeakSkills.map((skill) => ({
        name: getSkillDisplayName(skill),
        accuracy: skill.accuracy
      }))}
      reviews={reviews}
      layout={pageLayout(appearance.layout, "inicio")}
      freeLayout={appearance.freeLayout}
      startEditing={(Array.isArray(editar) ? editar[0] : editar) === "1"}
    />
  );
}
