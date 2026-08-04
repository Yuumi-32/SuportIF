import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { EngagementSignalCard } from "@/components/teacher/engagement-signal-card";
import { TeacherDashboardCard } from "@/components/teacher/teacher-dashboard-card";
import { TutorSimulationSummary } from "@/components/teacher/tutor-simulation-summary";
import { TutorSkillDifficultyList } from "@/components/teacher/tutor-skill-difficulty-list";
import { requireRole } from "@/lib/auth/session";
import { getTutorDashboard } from "@/server/queries/tutor";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const user = await requireRole(["TEACHER"]);
  const dashboard = await getTutorDashboard(user.id);

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-end">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Central tutor</Badge>
            <Badge variant="outline">{dashboard.classes.length} turma(s)</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Acompanhamento da turma</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Veja rapidamente progresso, dificuldade, revisões e sinais de engajamento dos alunos.
          </p>
        </div>
        <Link
          href="/tutor/turmas"
          className="inline-flex h-11 items-center justify-center rounded-md bg-violet-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-800"
        >
          Abrir turmas
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <TeacherDashboardCard label="Alunos" value={dashboard.studentCount} description="Vinculados às turmas." />
        <TeacherDashboardCard label="Ativos" value={dashboard.activeStudents} description="Acesso recente." />
        <TeacherDashboardCard label="Atenção" value={dashboard.attentionStudents} description="Sinais moderados." />
        <TeacherDashboardCard label="Risco alto" value={dashboard.highRiskStudents} description="Prioridade de apoio." />
        <TeacherDashboardCard label="Progresso" value={`${dashboard.averageProgress}%`} description="Média geral." />
        <TeacherDashboardCard label="Revisões" value={dashboard.overdueReviews} description="Atrasadas." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TutorSkillDifficultyList items={dashboard.difficultyItems} />
        <TutorSimulationSummary attempts={dashboard.latestSimulations} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ações sugeridas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentSignals.length > 0 ? (
              dashboard.recentSignals.slice(0, 4).map((signal) => (
                <div key={signal.id} className="rounded-lg border bg-white p-4">
                  <p className="font-semibold text-slate-950">{signal.user.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{signal.suggestedAction}</p>
                  <Link
                    href={`/tutor/alunos/${signal.userId}`}
                    className="mt-3 inline-flex text-sm font-semibold text-violet-700 hover:text-violet-800"
                  >
                    Ver aluno
                  </Link>
                </div>
              ))
            ) : (
              <EmptyState
                title="Sem sinais recentes"
                description="Nenhum alerta de engajamento foi registrado para suas turmas."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sinais recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentSignals.length > 0 ? (
              dashboard.recentSignals.map((signal) => (
                <EngagementSignalCard
                  key={signal.id}
                  id={signal.id}
                  type={signal.type}
                  severity={signal.severity}
                  message={signal.message}
                  suggestedAction={signal.suggestedAction}
                  createdAt={signal.createdAt}
                  user={signal.user}
                />
              ))
            ) : (
              <p className="text-sm text-slate-600">Nenhum sinal registrado.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
