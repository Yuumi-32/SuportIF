"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ActivityHeatmap } from "@/components/grades/activity-heatmap";
import { SimulationGradeList } from "@/components/grades/simulation-grade-list";
import { SkillGradeRow, formatGrade } from "@/components/grades/skill-grade-row";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildHeatmap,
  calculatePeakHour,
  calculateStreaks,
  filterByRange,
  gradeRanges,
  selectStrongPoints,
  selectWeakPoints,
  summarizeAnswers,
  summarizeSkillPerformance,
  type GradeRange
} from "@/lib/grades/performance";
import { getSkillDisplayName } from "@/lib/simulations/presentation";
import type { StudentGrades } from "@/server/queries/grades";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "materias", label: "Matérias" },
  { id: "simulados", label: "Simulados" }
] as const;

type Tab = (typeof tabs)[number]["id"];

const rangeLabels: Record<GradeRange, string> = {
  todos: "Todos",
  "30d": "30d",
  "7d": "7d"
};

/** Quantas semanas o mapa de atividade mostra em cada filtro. */
const rangeWeeks: Record<GradeRange, number> = {
  todos: 26,
  "30d": 6,
  "7d": 2
};

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-black text-slate-900" title={value}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

type GradesViewProps = {
  studentName: string;
  data: StudentGrades;
};

export function GradesView({ studentName, data }: GradesViewProps) {
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [range, setRange] = useState<GradeRange>("todos");

  const view = useMemo(() => {
    const answers = filterByRange(data.answers, range, data.todayKey);
    const studyEvents = filterByRange(data.studyEvents, range, data.todayKey);
    const simulations = filterByRange(data.simulations, range, data.todayKey);
    const skills = summarizeSkillPerformance(answers);

    return {
      answers,
      simulations,
      skills,
      summary: summarizeAnswers(answers),
      weakPoints: selectWeakPoints(skills),
      strongPoints: selectStrongPoints(skills),
      streaks: calculateStreaks(
        studyEvents.map((event) => event.dayKey),
        data.todayKey
      ),
      peakHour: calculatePeakHour(studyEvents),
      heatmap: buildHeatmap(studyEvents, data.todayKey, rangeWeeks[range])
    };
  }, [data, range]);

  const { summary, streaks, peakHour } = view;
  const answersPerActiveDay =
    streaks.activeDays === 0 ? 0 : Math.round(summary.total / streaks.activeDays);
  const strongestLabel = view.strongPoints[0]
    ? getSkillDisplayName({ key: view.strongPoints[0].key, label: view.strongPoints[0].label })
    : "—";
  const hasAnswers = summary.total > 0;
  // Não depende do filtro de período: o progresso da missão guarda só o total.
  const hardestMissions = data.missions
    .filter((mission) => mission.attemptsCount > 0 && !mission.completed)
    .sort((a, b) => a.accuracy - b.accuracy || b.attemptsCount - a.attemptsCount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Notas</h1>
        <p className="text-sm text-slate-600">
          Como {studentName.split(" ")[0]} está indo: notas por matéria, ritmo de estudo e os pontos que
          mais precisam de reforço.
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
          <span>Nível {data.progress.level}</span>
          <span>· {data.progress.totalXp} XP</span>
          <span>
            · {data.missionTotals.completed} de {data.missionTotals.total} missões concluídas
          </span>
          <span>· {data.badgeCount} badges</span>
        </p>
      </header>

      <Card className="bg-white">
        <CardHeader className="gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <nav
            aria-label="Seções das notas"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 sm:pb-0"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  tab === item.id
                    ? "bg-violet-700 text-white shadow-sm shadow-violet-900/20"
                    : "text-slate-600 hover:bg-violet-50 hover:text-violet-900"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div
            role="group"
            aria-label="Período"
            className="flex shrink-0 gap-1 rounded-md bg-slate-100 p-1"
          >
            {gradeRanges.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                aria-pressed={range === item}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                  range === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {rangeLabels[item]}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {tab === "visao-geral" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  label="Nota geral"
                  value={formatGrade(summary.grade)}
                  hint={`${summary.accuracy}% de acerto`}
                />
                <StatTile
                  label="Respostas"
                  value={`${summary.total}`}
                  hint={`${summary.correctCount} certas · ${summary.wrongCount} erradas`}
                />
                <StatTile label="Dias ativos" value={`${streaks.activeDays}`} />
                <StatTile label="Simulados feitos" value={`${view.simulations.length}`} />
                <StatTile label="Sequência atual" value={`${streaks.current}d`} />
                <StatTile label="Maior sequência" value={`${streaks.longest}d`} />
                <StatTile
                  label="Horário de pico"
                  value={peakHour ? `${peakHour.hour}h` : "—"}
                  hint={peakHour ? `${peakHour.count} atividades nesse horário` : undefined}
                />
                <StatTile label="Matéria mais firme" value={strongestLabel} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-950">Mapa de estudo</p>
                  <p className="text-xs text-slate-500">
                    Cada quadrado é um dia; quanto mais escuro, mais atividade.
                  </p>
                </div>
                <ActivityHeatmap heatmap={view.heatmap} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="font-semibold text-slate-950">Pontos fracos</p>
                  {view.weakPoints.length > 0 ? (
                    view.weakPoints.map((item) => <SkillGradeRow key={item.key} item={item} />)
                  ) : (
                    <EmptyState
                      title={hasAnswers ? "Nenhum ponto fraco no período" : "Ainda sem respostas"}
                      description={
                        hasAnswers
                          ? "Nenhuma matéria ficou abaixo de 6,0 nesse período. Continue praticando para manter o nível."
                          : "Responda exercícios das missões ou faça um simulado para o boletim começar a se formar."
                      }
                      action={
                        <Link
                          href={hasAnswers ? "/app/simulados" : "/app/trilhas"}
                          className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
                        >
                          {hasAnswers ? "Fazer um simulado" : "Começar uma trilha"}
                        </Link>
                      }
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <p className="font-semibold text-slate-950">Pontos fortes</p>
                  {view.strongPoints.length > 0 ? (
                    view.strongPoints.map((item) => (
                      <SkillGradeRow key={item.key} item={item} showMissionLink={false} />
                    ))
                  ) : (
                    <EmptyState
                      title="Nenhum ponto forte marcado ainda"
                      description="Uma matéria vira ponto forte quando passa de 8,0 com pelo menos 3 respostas registradas."
                    />
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500">
                {hasAnswers
                  ? `Você respondeu ${summary.total} questões em ${streaks.activeDays} dias de estudo — cerca de ${answersPerActiveDay} por dia ativo.`
                  : "O boletim se preenche sozinho conforme você responde exercícios e simulados."}
                {data.reviews.overdue > 0
                  ? ` Há ${data.reviews.overdue} ${
                      data.reviews.overdue === 1 ? "revisão atrasada" : "revisões atrasadas"
                    } esperando por você.`
                  : ""}
              </p>
            </>
          ) : null}

          {tab === "materias" ? (
            <div className="space-y-3">
              {view.skills.length > 0 ? (
                view.skills.map((item) => <SkillGradeRow key={item.key} item={item} />)
              ) : (
                <EmptyState
                  title="Sem notas por matéria no período"
                  description="Assim que você responder exercícios, cada assunto ganha uma nota de 0 a 10 aqui."
                  action={
                    <Link
                      href="/app/trilhas"
                      className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
                    >
                      Ver trilhas
                    </Link>
                  }
                />
              )}
            </div>
          ) : null}

          {tab === "simulados" ? (
            view.simulations.length > 0 ? (
              <SimulationGradeList items={view.simulations} />
            ) : (
              <EmptyState
                title="Nenhum simulado no período"
                description="Os simulados viram notas de 0 a 10 e mostram a evolução entre as tentativas."
                action={
                  <Link
                    href="/app/simulados"
                    className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
                  >
                    Ver simulados
                  </Link>
                }
              />
            )
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Missões com mais dificuldade</CardTitle>
          <CardDescription>
            Missões em que os exercícios ainda não fecharam — bons alvos para revisar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hardestMissions.length > 0 ? (
            hardestMissions.map((mission) => (
              <div
                key={mission.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/missoes/${mission.id}`}
                    className="font-semibold text-slate-950 underline-offset-2 hover:text-violet-700 hover:underline"
                  >
                    {mission.title}
                  </Link>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {mission.trackTitle} · {mission.moduleTitle}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-slate-600">
                  {mission.correctCount} de {mission.attemptsCount}{" "}
                  {mission.attemptsCount === 1 ? "tentativa certa" : "tentativas certas"}
                  <span className="ml-2 font-black text-slate-900">{mission.accuracy}%</span>
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">
              Nenhuma missão pendente com erros registrados. Boa!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
