import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { EngagementSignalCard } from "@/components/teacher/engagement-signal-card";
import { StudentDetailHeader } from "@/components/teacher/student-detail-header";
import { StudentTrackProgress } from "@/components/teacher/student-track-progress";
import { TeacherNoteForm } from "@/components/teacher/teacher-note-form";
import { TeacherNoteList } from "@/components/teacher/teacher-note-list";
import { TutorSkillDifficultyList } from "@/components/teacher/tutor-skill-difficulty-list";
import { requireRole } from "@/lib/auth/session";
import {
  formatReviewDueText,
  getReviewStatusLabel,
  getSkillDisplayName,
  parseSkillResults
} from "@/lib/simulations/presentation";
import { getTutorStudentDetail } from "@/server/queries/tutor";

export const dynamic = "force-dynamic";

export default async function TutorStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireRole(["TEACHER"]);
  const { id } = await params;
  const detail = await getTutorStudentDetail(teacher.id, id);

  if (!detail) {
    notFound();
  }

  const latestSimulation = detail.simulationAttempts[0];
  const latestWeakSkills = parseSkillResults(latestSimulation?.weakSkillsJson);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Link href="/tutor/turmas" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
          Voltar para turmas
        </Link>
        <StudentDetailHeader
          student={detail.summary.user}
          severity={detail.summary.severity}
          progressPercent={detail.summary.progressPercent}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <StudentTrackProgress tracks={detail.summary.trackSummaries} />
        <Card>
          <CardHeader>
            <CardTitle>Simulados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.simulationAttempts.length > 0 ? (
              detail.simulationAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-md border bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-950">{attempt.simulation.title}</p>
                  <p className="text-slate-600">
                    {attempt.score}% · {attempt.correctCount} acertos · {attempt.wrongCount} erros
                  </p>
                  <p className="text-xs text-slate-500">
                    {attempt.finishedAt?.toLocaleString("pt-BR") ?? "sem data"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">Nenhum simulado realizado.</p>
            )}
            {latestWeakSkills.length > 0 ? (
              <div className="rounded-md bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Pontos fracos do último simulado</p>
                <div className="mt-2 space-y-2">
                  {latestWeakSkills.slice(0, 3).map((skill) => (
                    <p key={skill.key} className="text-sm text-amber-950">
                      {getSkillDisplayName(skill)} · {skill.accuracy}%
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Revisões que merecem atenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.reviews.length > 0 ? (
              detail.reviews.map((review) => (
                <div key={review.id} className="rounded-md border bg-white p-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={review.status === "OVERDUE" ? "warning" : "outline"}>
                      {getReviewStatusLabel(review.status)}
                    </Badge>
                    <Badge variant="secondary">{formatReviewDueText(review.dueAt)}</Badge>
                  </div>
                  <p className="mt-2 font-semibold text-slate-950">{review.mission.title}</p>
                  <p className="text-slate-600">
                    {review.mission.module.track.title} · {review.mission.module.title}
                  </p>
                  <p className="text-xs text-slate-500">{formatReviewDueText(review.dueAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">Sem revisões pendentes.</p>
            )}
          </CardContent>
        </Card>

        <TutorSkillDifficultyList items={detail.difficulties} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tentativas de exercícios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.exerciseAttempts.length > 0 ? (
              detail.exerciseAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-md border bg-white p-3 text-sm leading-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={attempt.isCorrect ? "default" : "warning"}>
                      {attempt.isCorrect ? "Correta" : "Incorreta"}
                    </Badge>
                    {attempt.exercise.skill ? <Badge variant="outline">{attempt.exercise.skill.name}</Badge> : null}
                  </div>
                  <p className="mt-2 font-semibold text-slate-950">{attempt.exercise.prompt}</p>
                  <p className="text-slate-600">
                    {attempt.exercise.mission.module.track.title} · {attempt.exercise.mission.module.title}
                  </p>
                  <p className="text-xs text-slate-500">{attempt.createdAt.toLocaleString("pt-BR")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">Este aluno ainda não registrou tentativas de exercício.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sinais de engajamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.signals.length > 0 ? (
              detail.signals.map((signal) => (
                <EngagementSignalCard
                  key={signal.id}
                  id={signal.id}
                  type={signal.type}
                  severity={signal.severity}
                  message={signal.message}
                  suggestedAction={signal.suggestedAction}
                  createdAt={signal.createdAt}
                  user={detail.summary.user}
                />
              ))
            ) : (
              <EmptyState
                title="Sem sinais registrados"
                description="Nenhum sinal de engajamento foi registrado para este aluno."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nova observação</CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherNoteForm studentId={detail.summary.user.id} />
          </CardContent>
        </Card>
        <TeacherNoteList notes={detail.notes} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Histórico recente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {detail.activityLogs.length > 0 ? (
            detail.activityLogs.map((activity) => (
              <div key={activity.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">{activity.action}</p>
                <p className="text-slate-500">
                  {activity.entityType} · {activity.createdAt.toLocaleString("pt-BR")}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">Nenhuma atividade registrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
