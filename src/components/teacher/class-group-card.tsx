import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/dashboard/progress-bar";

type ClassGroupCardProps = {
  id: string;
  name: string;
  description: string;
  studentCount: number;
  averageProgress: number;
  attentionSignals: number;
  highRiskSignals: number;
  overdueReviews: number;
};

export function ClassGroupCard({
  id,
  name,
  description,
  studentCount,
  averageProgress,
  attentionSignals,
  highRiskSignals,
  overdueReviews
}: ClassGroupCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressBar value={averageProgress} label="Progresso médio" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Alunos" value={studentCount} />
          <Metric label="Atenção" value={attentionSignals} />
          <Metric label="Risco" value={highRiskSignals} />
          <Metric label="Revisões" value={overdueReviews} />
        </div>
        <Link
          href={`/tutor/turmas/${id}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-800"
        >
          Abrir turma
        </Link>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}
