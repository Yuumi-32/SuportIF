import Link from "next/link";
import { CheckCircle2, CircleDotDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMasteryStatusLabel } from "@/lib/learning/presentation";
import { cn } from "@/lib/utils";

type MissionCardProps = {
  id: string;
  title: string;
  description: string;
  masteryStatus: string;
  completed: boolean;
  attemptsCount: number;
  correctCount: number;
  exerciseCount: number;
};

export function MissionCard({
  id,
  title,
  description,
  masteryStatus,
  completed,
  attemptsCount,
  correctCount,
  exerciseCount
}: MissionCardProps) {
  const iconTone = completed
    ? "bg-violet-100 text-violet-700"
    : "bg-white text-slate-500 ring-1 ring-slate-200";

  return (
    <Card
      className={cn(
        "transition-colors hover:border-violet-200",
        completed ? "border-violet-200 bg-violet-50/40" : "bg-white"
      )}
    >
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn("flex h-8 w-8 items-center justify-center rounded-full", iconTone)}
              aria-hidden="true"
            >
              {completed ? <CheckCircle2 className="h-4 w-4" /> : <CircleDotDashed className="h-4 w-4" />}
            </span>
            <p className="font-semibold text-slate-950">{title}</p>
            <Badge variant={completed ? "default" : "outline"}>
              {completed ? "Concluída" : getMasteryStatusLabel(masteryStatus)}
            </Badge>
          </div>
          <p className="max-w-2xl pl-10 text-sm leading-6 text-slate-600 sm:pl-0">{description}</p>
          <p className="pl-10 text-xs font-medium text-slate-500 sm:pl-0">
            {correctCount}/{exerciseCount} acertos únicos · {attemptsCount} tentativa{attemptsCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/app/missoes/${id}`}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-violet-200 hover:text-violet-900"
        >
          {completed ? "Revisar missão" : "Estudar missão"}
        </Link>
      </CardContent>
    </Card>
  );
}
