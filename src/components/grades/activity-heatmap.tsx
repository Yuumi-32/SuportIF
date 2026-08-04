import type { Heatmap } from "@/lib/grades/performance";
import { cn } from "@/lib/utils";

/// Quadro de atividade no estilo "contribuições do GitHub": uma coluna por
/// semana, uma célula por dia estudado.

const levelClassNames = [
  "bg-slate-200/70",
  "bg-violet-200",
  "bg-violet-400",
  "bg-violet-600",
  "bg-violet-800"
];

const weekdayLabels = ["", "Seg", "", "Qua", "", "Sex", ""];

const monthLabels = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez"
];

function formatDayLabel(dayKey: string) {
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}/${year}`;
}

function monthLabelForWeek(week: Heatmap["weeks"][number], previousWeek?: Heatmap["weeks"][number]) {
  const currentMonth = week[0].dayKey.slice(5, 7);
  const previousMonth = previousWeek?.[0].dayKey.slice(5, 7);

  if (currentMonth === previousMonth) {
    return "";
  }

  return monthLabels[Number(currentMonth) - 1];
}

type ActivityHeatmapProps = {
  heatmap: Heatmap;
};

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  return (
    <div className="space-y-3">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex min-w-full gap-2">
          <div className="flex flex-col gap-1 pt-[18px] text-[10px] leading-[12px] text-slate-500">
            {weekdayLabels.map((label, index) => (
              <span key={index} className="h-3 w-7 text-right">
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            {heatmap.weeks.map((week, weekIndex) => (
              <div key={week[0].dayKey} className="flex flex-col gap-1">
                <span className="h-[14px] text-[10px] leading-[14px] text-slate-500">
                  {monthLabelForWeek(week, heatmap.weeks[weekIndex - 1])}
                </span>
                {week.map((day) => (
                  <span
                    key={day.dayKey}
                    title={
                      day.isFuture
                        ? formatDayLabel(day.dayKey)
                        : `${formatDayLabel(day.dayKey)} · ${day.count} ${
                            day.count === 1 ? "atividade" : "atividades"
                          }`
                    }
                    className={cn(
                      "h-3 w-3 rounded-[3px]",
                      day.isFuture ? "bg-slate-100" : levelClassNames[day.level]
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {heatmap.total} {heatmap.total === 1 ? "atividade" : "atividades"} em {heatmap.activeDays}{" "}
          {heatmap.activeDays === 1 ? "dia" : "dias"}
        </span>
        <span className="flex items-center gap-1">
          Menos
          {levelClassNames.map((className, index) => (
            <span key={index} className={cn("h-3 w-3 rounded-[3px]", className)} />
          ))}
          Mais
        </span>
      </div>
    </div>
  );
}
