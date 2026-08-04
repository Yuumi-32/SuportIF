import { CalendarDays, Flame, NotebookPen, Target, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type AccountSectionProps = {
  name: string;
  email: string;
  roleLabel: string;
  memberSince: string;
  lastLogin: string;
  explanationModeLabel: string;
  isStudent: boolean;
  progress: { level: number; totalXp: number; streak: number };
  overview: {
    completedMissionCount: number;
    noteCount: number;
    eventCount: number;
  };
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4 text-violet-700" /> {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

export function AccountSection({
  name,
  email,
  roleLabel,
  memberSince,
  lastLogin,
  explanationModeLabel,
  isStudent,
  progress,
  overview
}: AccountSectionProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Dados da conta</CardTitle>
              <CardDescription>Informações vinculadas ao seu acesso no SuportIF.</CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 bg-violet-50 text-violet-800">
              {roleLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Nome" value={name} />
          <InfoRow label="E-mail" value={email} />
          <InfoRow label="Conta criada em" value={memberSince} />
          <InfoRow label="Último acesso" value={lastLogin} />
          <InfoRow label="Explicação preferida" value={explanationModeLabel} />
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Seus números</CardTitle>
          <CardDescription>Resumo do que já foi registrado nesta conta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isStudent ? (
            <>
              <StatCard icon={Trophy} label="Nível" value={progress.level} />
              <StatCard icon={Flame} label="XP total" value={progress.totalXp} />
              <StatCard icon={Target} label="Missões concluídas" value={overview.completedMissionCount} />
            </>
          ) : null}
          <StatCard icon={NotebookPen} label="Notas salvas" value={overview.noteCount} />
          <StatCard icon={CalendarDays} label="Eventos na agenda" value={overview.eventCount} />
          {isStudent ? <StatCard icon={Flame} label="Sequência (dias)" value={progress.streak} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
