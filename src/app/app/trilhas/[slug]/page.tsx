import { notFound } from "next/navigation";

import { TrackDetail } from "@/components/tracks/track-detail";
import { requireRole } from "@/lib/auth/session";
import { getTrackMap } from "@/server/queries/student";

export const dynamic = "force-dynamic";

export default async function TrackMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireRole(["STUDENT"]);
  const { slug } = await params;
  const trackMap = await getTrackMap(user.id, slug);

  if (!trackMap) {
    notFound();
  }

  const { enrollment, summary } = trackMap;

  return (
    <TrackDetail enrolled={Boolean(enrollment)} summary={summary} />
  );
}
