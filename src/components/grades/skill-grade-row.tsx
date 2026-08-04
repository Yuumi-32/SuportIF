import Link from "next/link";

import { ProgressBar } from "@/components/dashboard/progress-bar";
import { Badge } from "@/components/ui/badge";
import type { SkillPerformance, SkillPerformanceStatus } from "@/lib/grades/performance";
import { getSkillDisplayName } from "@/lib/simulations/presentation";

/// Linha de nota por matéria, usada tanto no resumo de pontos fracos quanto na
/// aba "Matérias".

/// A cor do status fica só na etiqueta (fundo claro + texto escuro, que se
/// mantém legível em qualquer tema). A nota usa o cinza temático, porque as
/// escalas emerald/rose/amber não acompanham a personalização do usuário e
/// perdem contraste nos temas escuros.
const statusStyles: Record<SkillPerformanceStatus, { label: string; badge: string }> = {
  FORTE: { label: "Ponto forte", badge: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  ATENCAO: { label: "Precisa de atenção", badge: "border-amber-200 bg-amber-50 text-amber-800" },
  FRAGIL: { label: "Ponto fraco", badge: "border-rose-200 bg-rose-50 text-rose-800" },
  SEM_DADOS: { label: "Poucos dados", badge: "border-slate-200 bg-slate-100 text-slate-600" }
};

export function formatGrade(grade: number) {
  return grade.toFixed(1).replace(".", ",");
}

type SkillGradeRowProps = {
  item: SkillPerformance;
  showMissionLink?: boolean;
};

export function SkillGradeRow({ item, showMissionLink = true }: SkillGradeRowProps) {
  const style = statusStyles[item.status];
  const label = getSkillDisplayName({ key: item.key, label: item.label });
  // Em vários assuntos a missão tem o mesmo nome da matéria; nesse caso o atalho
  // só repetiria o título da linha.
  const missionLink =
    showMissionLink && item.weakestMission && item.weakestMission.title !== label
      ? item.weakestMission
      : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-sm text-slate-500">
            {item.correctCount} {item.correctCount === 1 ? "acerto" : "acertos"} e {item.wrongCount}{" "}
            {item.wrongCount === 1 ? "erro" : "erros"} em {item.total}{" "}
            {item.total === 1 ? "resposta" : "respostas"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge variant="outline" className={style.badge}>
            {style.label}
          </Badge>
          <p className="text-2xl font-black leading-none text-slate-900">{formatGrade(item.grade)}</p>
        </div>
      </div>

      <ProgressBar value={item.accuracy} className="mt-3" />

      {missionLink ? (
        <p className="mt-3 text-sm text-slate-600">
          Onde mais errou:{" "}
          <Link
            href={`/app/missoes/${missionLink.id}`}
            className="font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {missionLink.title}
          </Link>{" "}
          ({missionLink.wrongCount} {missionLink.wrongCount === 1 ? "erro" : "erros"})
        </p>
      ) : null}
    </div>
  );
}
