import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { MissionCard } from "@/components/tracks/mission-card";
import { requireRole } from "@/lib/auth/session";
import { getModuleDetail } from "@/server/queries/student";

export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["STUDENT"]);
  const { id } = await params;
  const detail = await getModuleDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Link
          href={`/app/trilhas/${detail.module.track.slug}`}
          className="text-sm font-semibold text-violet-700 hover:text-violet-800"
        >
          Voltar para {detail.module.track.title}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{detail.module.track.title}</Badge>
          <Badge variant="outline">{detail.enrollment ? "Na sua jornada" : "Trilha disponível"}</Badge>
        </div>
        <h1 className="text-3xl font-bold text-slate-950">{detail.module.title}</h1>
        <p className="max-w-3xl text-slate-600">{detail.module.description}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Progresso do módulo</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressBar
            value={detail.progressPercent}
            label={`${detail.completedMissions}/${detail.totalMissions} missões concluídas`}
          />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-950">Missões</h2>
        <div className="grid gap-3">
          {detail.missions.map((mission) => (
            <MissionCard
              key={mission.id}
              id={mission.id}
              title={mission.title}
              description={mission.shortDescription}
              masteryStatus={mission.masteryStatus}
              completed={mission.completed}
              attemptsCount={mission.attemptsCount}
              correctCount={mission.correctCount}
              exerciseCount={mission.exerciseCount}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
