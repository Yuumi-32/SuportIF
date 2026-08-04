import { pageLayout } from "@/lib/appearance/layout";
import { parseAppearance } from "@/lib/appearance/settings";
import { StudentReviews, type ReviewItem } from "@/components/reviews/student-reviews";
import { requireRole } from "@/lib/auth/session";
import { getRetentionPercent } from "@/lib/reviews/schedule";
import { formatReviewDueText, getReviewStatusLabel } from "@/lib/simulations/presentation";
import { getStudentReviews } from "@/server/queries/student";

export const dynamic = "force-dynamic";

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default async function StudentReviewsPage({
  searchParams
}: {
  searchParams: Promise<{ editar?: string | string[] }>;
}) {
  const user = await requireRole(["STUDENT"]);
  const { editar } = await searchParams;
  const appearance = parseAppearance(user.profile?.appearance);
  const reviews = await getStudentReviews(user.id);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const items: ReviewItem[] = reviews.map((review) => ({
    id: review.id,
    missionId: review.mission.id,
    title: review.mission.title,
    moduleLabel: `${review.mission.module.track.title} · ${review.mission.module.title}`,
    skillName: review.skill ? review.skill.name : null,
    dueText: formatReviewDueText(review.dueAt),
    statusLabel: getReviewStatusLabel(review.status),
    overdue: review.status === "OVERDUE" || review.dueAt < startOfToday,
    dueToday: isSameDay(review.dueAt, now),
    retentionPercent: getRetentionPercent(review.intervalDays),
    question: review.mission.objective || review.mission.guidedExercisePrompt,
    answer: review.mission.quickExplanation || review.mission.summary
  }));

  return (
    <StudentReviews
      reviews={items}
      layout={pageLayout(appearance.layout, "revisoes")}
      freeLayout={appearance.freeLayout}
      startEditing={(Array.isArray(editar) ? editar[0] : editar) === "1"}
    />
  );
}
