"use client";

import { Fish, X, Volleyball } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CatSprite } from "@/components/pet/cat-sprite";
import {
  advanceBehavior,
  bottomInset,
  chooseBehavior,
  clampToStage,
  createBehavior,
  getIdleChatter,
  interrupt,
  type BehaviorContext,
  type BehaviorState,
  type PetActivity
} from "@/lib/pet/behavior";
import { applyElapsedTime, type PetStats } from "@/lib/pet/state";
import { carePetAction } from "@/server/actions/pet";
import type { PetOverview } from "@/server/queries/pet";

export const roamingStorageKey = "suportif:pet-roaming";
export const roamingChangeEvent = "suportif:pet-roaming-change";

export function isRoamingEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(roamingStorageKey) !== "off";
}

export function setRoamingEnabled(enabled: boolean) {
  window.localStorage.setItem(roamingStorageKey, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent(roamingChangeEvent, { detail: enabled }));
}

/** Meia largura do bicho na tela — o `x` do comportamento é o centro dele. */
const catWidth = 120;
const catHeight = 88;
const bubbleMs = 2800;

/** Palco mínimo: abaixo disso não sobra caminho entre os cantos. */
const minStageWidth = 320;
const minStageHeight = 320;

function readStage() {
  if (typeof window === "undefined") {
    return { stageWidth: minStageWidth, stageHeight: minStageHeight };
  }

  return {
    stageWidth: Math.max(minStageWidth, window.innerWidth),
    stageHeight: Math.max(minStageHeight, window.innerHeight)
  };
}

const roamingCss = `
@keyframes pet-heart-pop {
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translateY(-46px) scale(1.15); opacity: 0; }
}
.pet-heart-pop { display: inline-block; animation: pet-heart-pop 1.3s ease-out forwards; }
@media (prefers-reduced-motion: reduce) {
  .pet-heart-pop { animation: none; opacity: 0; }
}
`;

type Toy = { x: number; y: number; dragging: boolean };

export function RoamingPet({ overview }: { overview: PetOverview }) {
  const [mounted, setMounted] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activity, setActivity] = useState<PetActivity>("idle");
  const [view, setView] = useState(overview);
  const [stats, setStats] = useState<PetStats>(overview.stats);
  const [toy, setToy] = useState<Toy | null>(null);
  const [bowl, setBowl] = useState<{ x: number; y: number } | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [hearts, setHearts] = useState(0);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const toyDragRef = useRef(false);
  const behaviorRef = useRef<BehaviorState>(createBehavior(160, minStageHeight, 0));
  const contextRef = useRef<BehaviorContext>({
    stats: overview.stats,
    stageWidth: minStageWidth,
    stageHeight: minStageHeight,
    toyX: null,
    toyY: null,
    cursorX: null,
    cursorY: null
  });
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  /**
   * Relógio do bicho, em milissegundos de animação — não do mundo.
   *
   * Ele avança pelo mesmo delta limitado que move as patas. Com o relógio do
   * mundo, uma aba engasgada (ou em segundo plano) faria a atividade "acabar"
   * por tempo enquanto o gato mal saiu do lugar, e ele trocaria de pose no meio
   * do caminho sem nunca chegar.
   */
  const clockRef = useRef(0);

  const say = useCallback((text: string) => {
    setBubble(text);

    if (bubbleTimer.current) {
      clearTimeout(bubbleTimer.current);
    }
    bubbleTimer.current = setTimeout(() => setBubble(null), bubbleMs);
  }, []);

  useEffect(() => {
    setMounted(true);
    setEnabled(isRoamingEnabled());

    // Ele entra em cena perto do rodapé, de onde sobe conforme quiser.
    const stage = readStage();
    const entrance = clampToStage(
      { x: Math.min(240, stage.stageWidth / 3), y: stage.stageHeight - bottomInset },
      stage
    );
    clockRef.current = 0;
    behaviorRef.current = createBehavior(entrance.x, entrance.y, 0);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motionQuery.matches);

    const onMotionChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    const onToggle = (event: Event) => setEnabled(Boolean((event as CustomEvent).detail));

    motionQuery.addEventListener("change", onMotionChange);
    window.addEventListener(roamingChangeEvent, onToggle);

    return () => {
      motionQuery.removeEventListener("change", onMotionChange);
      window.removeEventListener(roamingChangeEvent, onToggle);
    };
  }, []);

  useEffect(() => {
    setView(overview);
    setStats(overview.stats);
  }, [overview]);

  // Os medidores envelhecem enquanto a página fica aberta, igual na tela do Pet.
  useEffect(() => {
    const id = setInterval(() => {
      setStats(
        applyElapsedTime(
          {
            ...view.stats,
            syncedAt: view.now,
            lastFedAt: view.lastFedAt,
            lastPlayedAt: view.lastPlayedAt,
            lastPettedAt: view.lastPettedAt
          },
          new Date(),
          view.signals.streak
        )
      );
    }, 5000);

    return () => clearInterval(id);
  }, [view]);

  // Contexto que o cérebro lê a cada quadro, sempre atualizado sem re-render.
  useEffect(() => {
    contextRef.current = {
      ...contextRef.current,
      stats,
      toyX: toy ? toy.x : null,
      toyY: toy ? toy.y : null
    };
  }, [stats, toy]);

  /** `y` do comportamento é onde as patas encostam, daí descontar a altura. */
  const applyTransform = useCallback(() => {
    const state = behaviorRef.current;

    if (wrapperRef.current) {
      wrapperRef.current.style.transform = `translate3d(${Math.round(state.x - catWidth / 2)}px, ${Math.round(state.y - catHeight)}px, 0)`;
    }
    if (spriteRef.current) {
      spriteRef.current.style.transform = `scaleX(${state.facing})`;
    }
  }, []);

  /**
   * A janela muda de tamanho (resize, rotação do celular, barra do navegador
   * sumindo) e o palco muda junto. Sem isto o gato fica preso fora da tela.
   */
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const syncStage = () => {
      const stage = readStage();
      contextRef.current = { ...contextRef.current, ...stage };

      const state = behaviorRef.current;
      const inside = clampToStage({ x: state.x, y: state.y }, stage);

      if (inside.x !== state.x || inside.y !== state.y) {
        behaviorRef.current = { ...state, ...inside, targetX: null, targetY: null, endsAt: 0 };
        applyTransform();
      }
    };

    syncStage();
    window.addEventListener("resize", syncStage);
    return () => window.removeEventListener("resize", syncStage);
  }, [mounted, applyTransform]);

  const runCare = useCallback(
    async (action: "PET" | "PLAY" | "FEED") => {
      if (busyRef.current) {
        return;
      }

      busyRef.current = true;
      setBusy(true);

      try {
        const result = await carePetAction({ action });
        setView(result.overview);
        setStats(result.overview.stats);
        say(result.message);
        return result;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [say]
  );

  /** O laço. Um rAF só, movendo por transform — nada de estado do React por quadro. */
  useEffect(() => {
    if (!mounted || !enabled || reducedMotion) {
      return;
    }

    let frame = 0;
    let last = performance.now();

    const loop = (frameTime: number) => {
      // Volta de aba oculta não pode virar um salto de vários segundos.
      const delta = Math.min(frameTime - last, 120);
      last = frameTime;

      clockRef.current += delta;
      const time = clockRef.current;

      const context = contextRef.current;
      const current = behaviorRef.current;

      // Perseguindo novelo arrastado: o alvo muda junto com o mouse.
      if (current.activity === "chase" && context.toyX !== null && context.toyY !== null) {
        current.targetX = context.toyX;
        current.targetY = context.toyY;
      }

      const result = advanceBehavior(current, context, time, delta);
      behaviorRef.current = result.state;
      applyTransform();

      if (result.arrived && result.state.activity === "chase" && context.toyX !== null && !toyDragRef.current) {
        setToy(null);
        contextRef.current = { ...contextRef.current, toyX: null, toyY: null };
        behaviorRef.current = interrupt(behaviorRef.current, "cuddle", time);
        setActivity("cuddle");
        setHearts((value) => value + 1);
        void runCare("PLAY");
      } else if (result.done) {
        const next = chooseBehavior(result.state, context, time);
        behaviorRef.current = next;

        if (next.activity !== result.state.activity) {
          setActivity(next.activity);

          const chatter = getIdleChatter(next.activity, view.name);
          if (chatter && Math.random() < 0.5) {
            say(chatter);
          }
        }
      }

      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [mounted, enabled, reducedMotion, applyTransform, runCare, say, view.name]);

  // Ele repara em quem está por perto: cabeça levantada quando o mouse chega junto.
  useEffect(() => {
    if (!mounted || !enabled) {
      return;
    }

    let queued = false;

    const onMove = (event: PointerEvent) => {
      contextRef.current = { ...contextRef.current, cursorX: event.clientX, cursorY: event.clientY };

      if (queued) {
        return;
      }

      queued = true;
      setTimeout(() => {
        queued = false;
        const state = behaviorRef.current;
        const gap = Math.hypot(event.clientX - state.x, event.clientY - state.y);
        setLooking(gap < 150);
      }, 120);
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mounted, enabled]);

  // Arrastar o novelo.
  useEffect(() => {
    if (!toy?.dragging) {
      return;
    }

    const onMove = (event: PointerEvent) => {
      const stage = readStage();
      const x = Math.max(24, Math.min(stage.stageWidth - 24, event.clientX));
      const y = Math.max(24, Math.min(stage.stageHeight - 24, event.clientY));

      setToy({ x, y, dragging: true });
      contextRef.current = { ...contextRef.current, toyX: x, toyY: y };
    };

    const onUp = () => {
      toyDragRef.current = false;
      setToy((current) => (current ? { ...current, dragging: false } : null));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [toy?.dragging]);

  useEffect(() => () => {
    if (bubbleTimer.current) {
      clearTimeout(bubbleTimer.current);
    }
  }, []);

  function petTheCat() {
    behaviorRef.current = interrupt(behaviorRef.current, "cuddle", clockRef.current);
    setActivity("cuddle");
    setHearts((value) => value + 1);
    void runCare("PET");
  }

  function dropToy() {
    const stage = readStage();
    const from = behaviorRef.current;
    const target = clampToStage(
      {
        x: from.x < stage.stageWidth / 2 ? from.x + 260 : from.x - 260,
        y: from.y - 70
      },
      stage
    );

    setToy({ ...target, dragging: false });
    contextRef.current = { ...contextRef.current, toyX: target.x, toyY: target.y };
  }

  async function feed() {
    const result = await runCare("FEED");

    if (result?.status !== "success") {
      return;
    }

    // A tigela nasce na frente do focinho, do lado para onde ele está virado.
    const { x, y, facing } = behaviorRef.current;
    setBowl({ x: x + facing * 46, y });
    behaviorRef.current = interrupt(behaviorRef.current, "eat", clockRef.current);
    setActivity("eat");
    setTimeout(() => setBowl(null), 3600);
  }

  function dismiss() {
    setRoamingEnabled(false);
  }

  if (!mounted || !enabled) {
    return null;
  }

  const sleeping = activity === "sleep";
  const headAngle = looking && !sleeping ? -13 : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none">
      <style dangerouslySetInnerHTML={{ __html: roamingCss }} />

      {toy && (
        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            toyDragRef.current = true;
            setToy({ ...toy, dragging: true });
          }}
          title="Arraste o novelo"
          className="pointer-events-auto absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full active:cursor-grabbing"
          style={{ left: toy.x, top: toy.y }}
        >
          <svg viewBox="0 0 36 36" className="h-9 w-9">
            <circle cx="18" cy="18" r="15" fill="hsl(var(--violet-400))" />
            <path
              d="M7 12c9 3 15 10 18 19M11 7c9 3 17 12 20 21M6 20c6 2 10 6 13 11"
              fill="none"
              stroke="hsl(var(--violet-700))"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {bowl && (
        <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: bowl.x, top: bowl.y }}>
          <svg viewBox="0 0 40 22" className="h-6 w-10">
            <path d="M2 6h36l-4 13a3 3 0 0 1-3 2H9a3 3 0 0 1-3-2Z" fill="hsl(var(--violet-700))" />
            <ellipse cx="20" cy="7" rx="17" ry="5" fill="#e8a33d" />
          </svg>
        </div>
      )}

      <div ref={wrapperRef} className="absolute left-0 top-0 will-change-transform" style={{ width: catWidth }}>
        {/* O balão fica acima da barra de ações para os dois nunca se cobrirem. */}
        {bubble && (
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-8 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-xs font-medium text-slate-700 shadow-md">
            {bubble}
          </div>
        )}

        {sleeping && !bubble && (
          <div className="pointer-events-none absolute bottom-full right-4 mb-6 text-lg font-black text-violet-500">
            <span className="inline-block animate-bounce">z</span>
            <span className="inline-block text-sm">z</span>
          </div>
        )}

        {hearts > 0 && (
          <div key={hearts} className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2">
            <span className="pet-heart-pop text-lg">💜</span>
          </div>
        )}

        <div className="group pointer-events-auto relative" style={{ width: catWidth, height: catHeight }}>
          <div className="absolute inset-x-3 bottom-0 h-2 rounded-[50%] bg-slate-950/15 blur-[2px]" />

          <button
            type="button"
            onClick={petTheCat}
            disabled={busy}
            title={`Fazer carinho no ${view.name}`}
            className="block h-full w-full cursor-pointer"
          >
            <div ref={spriteRef} className="h-full w-full origin-bottom">
              <CatSprite activity={activity} headAngle={headAngle} className="h-full w-full" />
            </div>
          </button>

          <div className="absolute -top-7 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={feed}
              disabled={busy || view.treats.available === 0}
              title={
                view.treats.available > 0
                  ? `Alimentar (${view.treats.available} petiscos)`
                  : "Sem petiscos hoje — estude para ganhar"
              }
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-40"
            >
              <Fish className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={dropToy}
              disabled={busy || toy !== null}
              title="Soltar o novelo"
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-40"
            >
              <Volleyball className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              title={`Guardar o ${view.name}`}
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm transition-colors hover:bg-violet-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
