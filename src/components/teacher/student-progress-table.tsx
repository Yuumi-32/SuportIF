import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { StudentRiskBadge } from "@/components/teacher/student-risk-badge";

type StudentProgressTableProps = {
  students: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      lastLoginAt: Date | null;
      profile: {
        totalXp: number;
        level: number;
      } | null;
    };
    progressPercent: number;
    pendingReviews: number;
    overdueReviews: number;
    severity: "NORMAL" | "ATTENTION" | "HIGH_RISK";
    latestSimulation: {
      score: number;
      simulation: {
        title: string;
      };
    } | null;
  }>;
};

export function StudentProgressTable({ students }: StudentProgressTableProps) {
  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-slate-600">Nenhum aluno encontrado neste filtro.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {students.map((student) => (
        <Card key={student.user.id}>
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.1fr_1fr_1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/tutor/alunos/${student.user.id}`}
                  className="font-semibold text-slate-950 hover:text-violet-800"
                >
                  {student.user.name}
                </Link>
                <StudentRiskBadge severity={student.severity} />
              </div>
              <p className="mt-1 text-sm text-slate-500">{student.user.email}</p>
              <p className="mt-1 text-xs text-slate-500">
                Último acesso: {student.user.lastLoginAt?.toLocaleDateString("pt-BR") ?? "sem registro"}
              </p>
            </div>
            <ProgressBar value={student.progressPercent} label="Progresso" />
            <div className="text-sm text-slate-600">
              <p>
                XP: <strong>{student.user.profile?.totalXp ?? 0}</strong> · Nível{" "}
                <strong>{student.user.profile?.level ?? 1}</strong>
              </p>
              <p>
                Revisões: <strong>{student.pendingReviews}</strong> · Atrasadas{" "}
                <strong>{student.overdueReviews}</strong>
              </p>
              <p>
                Último simulado:{" "}
                <strong>
                  {student.latestSimulation
                    ? `${student.latestSimulation.score}%`
                    : "sem tentativa"}
                </strong>
              </p>
            </div>
            <Link
              href={`/tutor/alunos/${student.user.id}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            >
              Detalhes
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
