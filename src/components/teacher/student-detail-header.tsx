import { Card, CardContent } from "@/components/ui/card";
import { StudentRiskBadge } from "@/components/teacher/student-risk-badge";

type StudentDetailHeaderProps = {
  student: {
    name: string;
    email: string;
    lastLoginAt: Date | null;
    profile: {
      totalXp: number;
      level: number;
      streak: number;
    } | null;
  };
  severity: "NORMAL" | "ATTENTION" | "HIGH_RISK";
  progressPercent: number;
};

export function StudentDetailHeader({ student, severity, progressPercent }: StudentDetailHeaderProps) {
  return (
    <Card className="border-violet-100 bg-white">
      <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <StudentRiskBadge severity={severity} />
            <span className="rounded-md bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-900">
              {progressPercent}% de progresso médio
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">{student.name}</h1>
          <p className="mt-1 text-slate-600">{student.email}</p>
          <p className="mt-2 text-sm text-slate-500">
            Último acesso: {student.lastLoginAt?.toLocaleDateString("pt-BR") ?? "sem registro"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Metric label="XP" value={student.profile?.totalXp ?? 0} />
          <Metric label="Nível" value={student.profile?.level ?? 1} />
          <Metric label="Streak" value={student.profile?.streak ?? 0} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-violet-800">{value}</p>
    </div>
  );
}
