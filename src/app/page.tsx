import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, RefreshCw, Route, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/layout/public-header";
import { getLevelLabel, getTrackIcon } from "@/lib/learning/presentation";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trackCount, missionCount, exerciseCount, reviewCount, simulationCount, tracks, featuredMission] =
    await Promise.all([
      prisma.track.count({ where: { isPublic: true } }),
      prisma.mission.count({ where: { isDemo: true } }),
      prisma.exercise.count({ where: { isDemo: true } }),
      prisma.reviewSchedule.count(),
      prisma.simulation.count({ where: { isDemo: true } }),
      prisma.track.findMany({
        where: { isPublic: true },
        select: {
          title: true,
          description: true,
          area: true,
          coverIcon: true,
          level: true,
          _count: {
            select: {
              modules: true
            }
          }
        },
        orderBy: { createdAt: "asc" },
        take: 6
      }),
      prisma.mission.findFirst({
        where: { isDemo: true },
        orderBy: { order: "asc" },
        include: {
          module: {
            include: {
              track: true
            }
          },
          exercises: {
            include: {
              options: true
            },
            orderBy: { order: "asc" },
            take: 1
          }
        }
      })
    ]);

  const featuredExercise = featuredMission?.exercises[0];

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <PublicHeader />

      <section className="relative overflow-hidden border-b border-violet-100 bg-violet-50/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-20">
          <div className="space-y-7">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white text-violet-800 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Jornada de aprendizado
              </Badge>
              <Badge variant="outline" className="bg-white/80">
                Seu progresso fica salvo
              </Badge>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
                Trilhas, missões e revisões para estudar com mais direção.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700">
                O SuportIF transforma trilhas demonstrativas em uma experiência de estudo guiada:
                avance por etapas curtas, pratique com feedback, revise no momento certo e acompanhe sua evolução.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-violet-700 px-5 text-sm font-bold text-white shadow-lg shadow-violet-900/20 transition-colors hover:bg-violet-800"
              >
                Entrar na plataforma
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#trilhas"
                className="inline-flex h-11 items-center justify-center rounded-md border border-violet-200 bg-white px-5 text-sm font-bold text-violet-900 transition-colors hover:bg-violet-50"
              >
                Explorar trilhas demonstrativas
              </Link>
            </div>
            <p className="text-sm leading-6 text-slate-500">
              Conteúdo demonstrativo, fictício e não oficial.
            </p>
          </div>

          <Card className="border-violet-100 bg-white/95 shadow-2xl shadow-violet-900/10">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="secondary" className="bg-violet-50 text-violet-800">
                    Continue de onde parou
                  </Badge>
                  <CardTitle className="mt-3 text-2xl leading-tight">
                    {featuredMission?.title ?? "Missão demonstrativa"}
                  </CardTitle>
                </div>
                <div className="rounded-lg bg-violet-700 px-4 py-3 text-center text-white shadow-sm shadow-violet-900/25">
                  <p className="text-xs font-semibold">XP</p>
                  <p className="text-xl font-black">{featuredMission?.xpReward ?? 0}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase text-violet-700">
                  {featuredMission?.module.track.title ?? "Trilha demonstrativa"} ·{" "}
                  {featuredMission?.module.title ?? "Módulo"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {featuredMission?.quickExplanation ??
                    "Missões organizam explicação rápida, exemplo, exercício guiado e desafio."}
                </p>
              </div>
              {featuredExercise ? (
                <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase text-violet-700">
                    <CheckCircle2 className="h-4 w-4" /> Exercício guiado
                  </p>
                  <p className="text-sm font-bold text-violet-950">{featuredExercise.prompt}</p>
                  <div className="grid gap-2">
                    {featuredExercise.options.slice(0, 3).map((option) => (
                      <div key={option.id} className="rounded-md border border-violet-100 bg-white px-3 py-2 text-sm text-slate-700">
                        {option.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Trilhas" value={trackCount} />
                <Metric label="Missões" value={missionCount} />
                <Metric label="Exercícios" value={exerciseCount} />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="trilhas" className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="bg-violet-50 text-violet-800">
              Trilhas interativas
            </Badge>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Aprendizado organizado por caminhos curtos.</h2>
            <p className="mt-3 leading-7 text-slate-600">
              As trilhas abaixo mostram como conteúdo, progresso e prática se conectam em uma rotina de estudo
              mais clara.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tracks.map((track) => {
              const Icon = getTrackIcon(track.coverIcon);

              return (
                <Card
                  key={track.title}
                  className="group h-full transition-transform hover:-translate-y-0.5 hover:border-violet-200"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      {Icon ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-800 ring-1 ring-violet-100">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : null}
                      {track.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{track.area}</Badge>
                      <Badge variant="outline">{getLevelLabel(track.level)}</Badge>
                      <Badge variant="secondary">{track._count.modules} módulos</Badge>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{track.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
          <Feature
            icon={<BookOpenCheck className="h-5 w-5" />}
            title="Missões guiadas"
            description="Conteúdo em camadas com objetivo, exemplo, exercício guiado e desafio sem ajuda."
          />
          <Feature
            icon={<RefreshCw className="h-5 w-5" />}
            title="Revisões e simulados"
            description={`${reviewCount} revisões ajudam a voltar no momento certo e ${simulationCount} simulados apoiam sua prática.`}
          />
          <Feature
            icon={<Route className="h-5 w-5" />}
            title="Progresso visível"
            description={`${exerciseCount} exercícios demonstrativos ajudam a acompanhar XP, histórico e evolução.`}
          />
        </div>
      </section>

      <section id="open-source" className="py-14 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Badge variant="secondary" className="bg-violet-50 text-violet-800">
              Código aberto
            </Badge>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Transparente sobre o caráter demonstrativo.</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              O SuportIF é um projeto aberto, pensado para evoluir com colaboração e aprendizado compartilhado.
            </p>
            <p>
              O conteúdo de apresentação é demonstrativo, fictício e não oficial. Ele existe para mostrar a jornada
              de estudo dentro da plataforma.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 font-bold text-violet-800 hover:text-violet-900">
              Acessar plataforma
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-3 shadow-sm shadow-violet-950/[0.03]">
      <p className="text-2xl font-black text-violet-800">{value}</p>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-white">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}
