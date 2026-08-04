import { pageLayout } from "@/lib/appearance/layout";
import { parseAppearance } from "@/lib/appearance/settings";
import { StudentTracks, type StudentTrackItem } from "@/components/tracks/student-tracks";
import { requireRole } from "@/lib/auth/session";
import { getStudentTracksPage } from "@/server/queries/student";

export const dynamic = "force-dynamic";

function toTrackItem(summary: {
  id: string;
  title: string;
  slug: string;
  description: string;
  area: string;
  coverIcon: string;
  completedMissions: number;
  totalMissions: number;
  progressPercent: number;
}): StudentTrackItem {
  return {
    id: summary.id,
    title: summary.title,
    slug: summary.slug,
    description: summary.description,
    area: summary.area,
    coverIcon: summary.coverIcon,
    completedMissions: summary.completedMissions,
    totalMissions: summary.totalMissions,
    progressPercent: summary.progressPercent,
  };
}

export default async function StudentTracksPage({
  searchParams
}: {
  searchParams: Promise<{ editar?: string | string[] }>;
}) {
  const user = await requireRole(["STUDENT"]);
  const { editar } = await searchParams;
  const appearance = parseAppearance(user.profile?.appearance);
  const { enrolledTracks, availableTracks } = await getStudentTracksPage(user.id);

  return (
    <StudentTracks
      enrolled={enrolledTracks.map(({ summary }) => toTrackItem(summary))}
      available={availableTracks.map(toTrackItem)}
      layout={pageLayout(appearance.layout, "trilhas")}
      freeLayout={appearance.freeLayout}
      startEditing={(Array.isArray(editar) ? editar[0] : editar) === "1"}
    />
  );
}
