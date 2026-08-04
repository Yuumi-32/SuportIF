import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { StudentProgressTable } from "@/components/teacher/student-progress-table";
import { TutorSkillDifficultyList } from "@/components/teacher/tutor-skill-difficulty-list";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { getTutorClassDetail } from "@/server/queries/tutor";

export const dynamic = "force-dynamic";

const filters = [
  { id: "todos", label: "Todos" },
  { id: "atencao", label: "Em atenção" },
  { id: "risco", label: "Risco alto" },
  { id: "revisoes", label: "Revisões atrasadas" }
];

export default async function TutorClassDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filtro?: string }>;
}) {
  const user = await requireRole(["TEACHER"]);
  const { id } = await params;
  const { filtro = "todos" } = await searchParams;
  const detail = await getTutorClassDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  const filteredStudents = detail.studentSummaries.filter((student) => {
    if (filtro === "atencao") {
      return student.severity === "ATTENTION";
    }

    if (filtro === "risco") {
      return student.severity === "HIGH_RISK";
    }

    if (filtro === "revisoes") {
      return student.overdueReviews > 0;
    }

    return true;
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Link href="/tutor/turmas" className="text-sm font-semibold text-violet-700 hover:text-violet-800">
          Voltar para turmas
        </Link>
        <Badge variant="secondary">Detalhe da turma</Badge>
        <h1 className="text-3xl font-bold text-slate-950">{detail.classGroup.name}</h1>
        <p className="max-w-3xl text-slate-600">{detail.classGroup.description}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Progresso médio</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar value={detail.averageProgress} label={`${detail.averageProgress}% da turma`} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revisões atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-amber-700">{detail.overdueReviews}</p>
            <p className="mt-2 text-sm text-slate-600">Pendências de revisão dos alunos da turma.</p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={`/tutor/turmas/${id}?filtro=${filter.id}`}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
              filtro === filter.id
                ? "border-violet-700 bg-violet-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </section>

      <StudentProgressTable students={filteredStudents} />

      <TutorSkillDifficultyList items={detail.difficultyItems} />
    </div>
  );
}
