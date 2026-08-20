import { pageLayout } from "@/lib/appearance/layout";
import { parseAppearance } from "@/lib/appearance/settings";
import { StudentReviews, type ReviewBucket, type ReviewItem } from "@/components/reviews/student-reviews";
import { requireRole } from "@/lib/auth/session";
import { getRetentionPercent } from "@/lib/reviews/schedule";
import { formatReviewDueText } from "@/lib/simulations/presentation";
import { getStudentReviews } from "@/server/queries/student";

export const dynamic = "force-dynamic";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Degrau de prazo do cartão. Passar de uma semana significa que a escada de
 * revisões já chegou ao intervalo mais longo — é o que a página chama de
 * "dominada".
 */
function getReviewBucket(dueAt: Date, status: string, now: Date): ReviewBucket {
  const diffDays = Math.round((startOfDay(dueAt).getTime() - startOfDay(now).getTime()) / 86_400_000);

  if (status === "OVERDUE" || diffDays < 0) {
    return "late";
  }

  if (diffDays === 0) {
    return "today";
  }

  return diffDays <= 7 ? "week" : "mastered";
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

  const items: ReviewItem[] = reviews.map((review) => ({
    id: review.id,
    missionId: review.mission.id,
    title: review.mission.title,
    // Módulo de missão única costuma repetir o título dela; nesse caso a linha
    // de contexto fica só com a trilha, para não ecoar o cabeçalho do cartão.
    moduleLabel:
      review.mission.module.title === review.mission.title
        ? review.mission.module.track.title
        : `${review.mission.module.track.title} · ${review.mission.module.title}`,
    trackIcon: review.mission.module.track.coverIcon,
    dueText: formatReviewDueText(review.dueAt, now),
    bucket: getReviewBucket(review.dueAt, review.status, now),
    intervalDays: review.intervalDays,
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
