"use client";

import {
  AlarmClock,
  CalendarCheck,
  Fish,
  Flame,
  Footprints,
  Gamepad2,
  Hand,
  Loader2,
  Pencil,
  Star
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { BlackCat, type PetReaction } from "@/components/pet/black-cat";
import { isRoamingEnabled, roamingChangeEvent, setRoamingEnabled } from "@/components/pet/roaming-pet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  applyElapsedTime,
  formatWait,
  getCollarLabel,
  getCooldownRemainingMs,
  getPetMood,
  getPetMoodMessage,
  getWellbeing,
  petMoodLabels,
  type PetAction,
  type PetState
} from "@/lib/pet/state";
import { cn } from "@/lib/utils";
import { carePetAction, renamePetAction } from "@/server/actions/pet";
import type { PetOverview } from "@/server/queries/pet";

type PetViewProps = {
  ownerName: string;
  overview: PetOverview;
};

const meters: Array<{ key: "satiety" | "energy" | "affection"; label: string; hint: string; color: string }> = [
  { key: "satiety", label: "Saciedade", hint: "cai sozinha com o tempo", color: "#d97706" },
  { key: "energy", label: "Energia", hint: "volta enquanto ele descansa", color: "#0d9488" },
  { key: "affection", label: "Carinho", hint: "sobe com atenção sua", color: "hsl(var(--violet-600))" }
];

const reactionByAction: Record<PetAction, PetReaction> = {
  FEED: "eat",
  PLAY: "play",
  PET: "hearts"
};

export function PetView({ ownerName, overview }: PetViewProps) {
  const [view, setView] = useState(overview);
  const [now, setNow] = useState(() => overview.now);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const [reaction, setReaction] = useState<PetReaction>("none");
  const [reactionKey, setReactionKey] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(overview.name);
  const [roaming, setRoaming] = useState(true);
  const [isPending, startTransition] = useTransition();
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = ownerName.trim().split(/\s+/)[0] || "estudante";

  // Recarregou no servidor (revalidate, voltar de outra página): a verdade é a nova.
  useEffect(() => {
    setView(overview);
    setNow(overview.now);
    setDraftName(overview.name);
  }, [overview]);

  // Relógio local: move os medidores e os tempos de espera sem recarregar a página.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // O passeio é preferência local (localStorage), então só dá para ler depois de montar.
  useEffect(() => {
    setRoaming(isRoamingEnabled());

    const onChange = (event: Event) => setRoaming(Boolean((event as CustomEvent).detail));
    window.addEventListener(roamingChangeEvent, onChange);
    return () => window.removeEventListener(roamingChangeEvent, onChange);
  }, []);

  useEffect(() => () => {
    if (reactionTimer.current) {
      clearTimeout(reactionTimer.current);
    }
  }, []);

  /** Base para envelhecer os medidores no navegador com a mesma regra do servidor. */
  const baseState = useMemo<PetState>(
    () => ({
      ...view.stats,
      syncedAt: view.now,
      lastFedAt: view.lastFedAt,
      lastPlayedAt: view.lastPlayedAt,
      lastPettedAt: view.lastPettedAt
    }),
    [view]
  );

  const stats = applyElapsedTime(baseState, now, view.signals.streak);
  const mood = getPetMood(stats, view.signals);
  const moodMessage = getPetMoodMessage(mood, view.name, view.signals);
  const wellbeing = getWellbeing(stats);

  const waits: Record<PetAction, number> = {
    FEED: getCooldownRemainingMs(baseState, "FEED", now),
    PLAY: getCooldownRemainingMs(baseState, "PLAY", now),
    PET: getCooldownRemainingMs(baseState, "PET", now)
  };

  function care(action: PetAction) {
    if (isPending) {
      return;
    }

    setReaction(reactionByAction[action]);
    setReactionKey((key) => key + 1);

    if (reactionTimer.current) {
      clearTimeout(reactionTimer.current);
    }
    reactionTimer.current = setTimeout(() => setReaction("none"), 1500);

    startTransition(async () => {
      const result = await carePetAction({ action });

      setView(result.overview);
      setNow(result.overview.now);
      setFeedback({ text: result.message, error: result.status === "error" });

      if (result.status === "error") {
        setReaction("none");
      }
    });
  }

  function rename() {
    startTransition(async () => {
      const result = await renamePetAction({ name: draftName });

      setView(result.overview);
      setNow(result.overview.now);
      setFeedback({ text: result.message, error: result.status === "error" });

      if (result.status === "success") {
        setRenaming(false);
      }
    });
  }

  const actions: Array<{ action: PetAction; label: string; icon: typeof Fish; note: string; blocked: boolean }> = [
    {
      action: "FEED",
      label: "Alimentar",
      icon: Fish,
      note:
        view.treats.available > 0
          ? `${view.treats.available} de ${view.treats.allowance} ${view.treats.allowance === 1 ? "petisco" : "petiscos"} hoje`
          : "sem petiscos — estude para ganhar",
      blocked: view.treats.available === 0
    },
    {
      action: "PLAY",
      label: "Brincar",
      icon: Gamepad2,
      note: stats.energy < 25 ? "ele está sem energia" : "gasta energia, rende carinho",
      blocked: stats.energy < 25
    },
    {
      action: "PET",
      label: "Fazer carinho",
      icon: Hand,
      note: "de graça, sempre funciona",
      blocked: false
    }
  ];

  const progressCards = [
    { icon: Flame, label: "Ofensiva", value: `${view.signals.streak} ${view.signals.streak === 1 ? "dia" : "dias"}` },
    { icon: Star, label: "Nível", value: String(view.signals.level) },
    { icon: CalendarCheck, label: "Atividades hoje", value: String(view.signals.activitiesToday) },
    { icon: AlarmClock, label: "Revisões atrasadas", value: String(view.signals.overdueReviews) }
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Pet</h1>
        <p className="text-sm text-slate-600">
          {view.name} acompanha o seu estudo: o que você faz na plataforma vira comida, energia e humor.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {renaming ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      maxLength={20}
                      aria-label="Nome do pet"
                      className="h-9"
                    />
                    <Button size="sm" onClick={rename} disabled={isPending}>
                      Salvar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-2xl font-bold text-slate-950">{view.name}</h2>
                    <Badge variant="secondary">{petMoodLabels[mood]}</Badge>
                    <button
                      type="button"
                      onClick={() => setRenaming(true)}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Renomear pet"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black leading-none text-violet-800">{wellbeing}%</p>
                <p className="text-xs font-semibold text-slate-500">bem-estar</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => care("PET")}
              disabled={isPending}
              title="Fazer carinho"
              className="flex w-full justify-center rounded-lg bg-violet-50 p-4 transition-colors hover:bg-violet-100 disabled:opacity-70"
            >
              <BlackCat
                mood={mood}
                reaction={reaction}
                reactionKey={reactionKey}
                collarLabel={getCollarLabel(view.signals.level)}
                className="h-56 w-56"
              />
            </button>

            <p
              className={cn(
                "min-h-10 rounded-md border px-3 py-2 text-sm",
                feedback?.error
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              )}
              aria-live="polite"
            >
              {feedback?.text ?? moodMessage}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5 p-6">
              <div className="space-y-4">
                {meters.map((meter) => {
                  const value = stats[meter.key];

                  return (
                    <div key={meter.key} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{meter.label}</span>
                        <span className="text-xs text-slate-500">
                          {value}% · {meter.hint}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-label={meter.label}
                        aria-valuenow={value}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${value}%`, background: meter.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {actions.map((item) => {
                  const wait = waits[item.action];
                  const disabled = isPending || wait > 0 || item.blocked;
                  const Icon = item.icon;

                  return (
                    <div key={item.action} className="space-y-1.5">
                      <Button
                        variant={item.action === "PET" ? "secondary" : "default"}
                        className="w-full"
                        disabled={disabled}
                        onClick={() => care(item.action)}
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                        {item.label}
                      </Button>
                      <p className="text-center text-xs text-slate-500">
                        {wait > 0 ? `disponível em ${formatWait(wait)}` : item.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-950">O que o {view.name} está vendo</h3>
                <p className="text-sm text-slate-600">
                  Estes números vêm do seu estudo, {firstName} — são eles que mudam o humor dele.
                </p>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2">
                {progressCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.label}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-violet-700" />
                      <div className="min-w-0">
                        <dt className="text-xs font-semibold text-slate-500">{card.label}</dt>
                        <dd className="text-sm font-semibold text-slate-900">{card.value}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>

              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>Cada missão, revisão ou simulado concluído hoje vira um petisco.</li>
                <li>Com ofensiva de 3 dias ou mais ele sente menos fome enquanto você está fora.</li>
                <li>Revisão atrasada deixa o {view.name} de orelha em pé.</li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  setRoamingEnabled(!roaming);
                  setRoaming(!roaming);
                }}
                aria-pressed={roaming}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-colors",
                  roaming
                    ? "border-violet-700 bg-violet-50"
                    : "border-dashed border-slate-300 bg-white hover:border-violet-200 hover:bg-slate-50"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Footprints className="h-4 w-4 text-violet-700" /> {view.name} passeia pelas telas
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      roaming ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {roaming ? "Solto" : "Guardado"}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Ele anda na parte de baixo de qualquer tela, dorme nos cantos e aceita carinho no clique.
                </span>
              </button>

              {view.signals.overdueReviews > 0 && (
                <Link
                  href="/app/revisoes"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-violet-50 px-4 text-sm font-semibold text-violet-900 transition-colors hover:bg-violet-100"
                >
                  Acalmar o {view.name}: fazer as revisões
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
