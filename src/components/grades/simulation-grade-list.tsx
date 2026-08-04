import Link from "next/link";

import { formatGrade } from "@/components/grades/skill-grade-row";
import { Badge } from "@/components/ui/badge";
import { getSimulationTypeLabel } from "@/lib/simulations/presentation";
import type { SimulationGrade } from "@/server/queries/grades";

/// Boletim dos simulados: uma nota por tentativa, da mais recente para a mais
/// antiga, com a variação em relação à tentativa anterior do mesmo simulado.

function formatDayLabel(dayKey: string) {
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}/${year}`;
}

/// Mesma regra da lista de matérias: a cor vive na etiqueta, a nota fica no
/// cinza temático para não perder contraste em temas escuros.
function deltaBadgeClassName(delta: number) {
  if (delta > 0) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (delta < 0) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

/** Compara com a tentativa anterior do mesmo simulado (a lista vem decrescente). */
function findPreviousScore(items: SimulationGrade[], index: number) {
  for (let next = index + 1; next < items.length; next += 1) {
    if (items[next].simulationId === items[index].simulationId) {
      return items[next].score;
    }
  }

  return null;
}

type SimulationGradeListProps = {
  items: SimulationGrade[];
};

export function SimulationGradeList({ items }: SimulationGradeListProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const previousScore = findPreviousScore(items, index);
        const delta = previousScore === null ? null : item.score - previousScore;

        return (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/app/simulados/${item.simulationId}/resultado?attemptId=${item.id}`}
                  className="font-semibold text-slate-950 underline-offset-2 hover:text-violet-700 hover:underline"
                >
                  {item.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                    {getSimulationTypeLabel(item.type)}
                  </Badge>
                  <span>{formatDayLabel(item.dayKey)}</span>
                  <span>
                    · {item.correctCount} de {item.total} questões
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="text-2xl font-black leading-none text-slate-900">
                  {formatGrade(item.grade)}
                </p>
                {delta !== null ? (
                  <Badge variant="outline" className={deltaBadgeClassName(delta)}>
                    {delta > 0 ? "+" : ""}
                    {formatGrade(delta / 10)} desde a anterior
                  </Badge>
                ) : (
                  <p className="text-xs text-slate-500">primeira tentativa</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
