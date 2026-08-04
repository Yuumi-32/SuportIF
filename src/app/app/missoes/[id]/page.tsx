import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MissionReader } from "@/components/missions/mission-reader";
import { requireRole } from "@/lib/auth/session";
import { getMasteryStatusLabel } from "@/lib/learning/presentation";
import { getMissionDetail, recordMissionStudy } from "@/server/queries/student";

export const dynamic = "force-dynamic";

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["STUDENT"]);
  const { id } = await params;

  await recordMissionStudy(user.id, id);
  const mission = await getMissionDetail(user.id, id);

  if (!mission) {
    notFound();
  }

  const progress = mission.progress[0];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link
            href={`/app/trilhas/${mission.module.track.slug}`}
            className="text-violet-700 hover:text-violet-800"
          >
            {mission.module.track.title}
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href={`/app/modulos/${mission.module.id}`}
            className="text-violet-700 hover:text-violet-800"
          >
            {mission.module.title}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {mission.tags.map((missionTag) => (
            <Badge key={missionTag.tagId} variant="outline">
              {missionTag.tag.name}
            </Badge>
          ))}
        </div>
        {progress ? (
          <Card className="bg-white">
            <CardContent className="grid gap-3 p-4 text-sm text-slate-700 sm:grid-cols-3">
              <span className="rounded-md bg-slate-50 px-3 py-2">
                Domínio: <strong>{getMasteryStatusLabel(progress.masteryStatus)}</strong>
              </span>
              <span className="rounded-md bg-slate-50 px-3 py-2">
                Tentativas: <strong>{progress.attemptsCount}</strong>
              </span>
              <span className="rounded-md bg-slate-50 px-3 py-2">
                Acertos únicos: <strong>{progress.correctCount}</strong>
              </span>
            </CardContent>
          </Card>
        ) : null}
      </section>

      <MissionReader mission={mission} preferredExplanationMode={user.profile?.preferredExplanationMode} />
    </div>
  );
}
