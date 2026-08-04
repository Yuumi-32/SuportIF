/// Cérebro do gato que passeia pelas telas.
///
/// Aqui não existe React nem DOM: são só decisões e deslocamento, para o
/// comportamento poder ser testado sem navegador. Quem desenha é
/// components/pet/cat-sprite.tsx e quem roda o relógio é roaming-pet.tsx.
///
/// A divisão é: `chooseBehavior` decide o que fazer agora, `advanceBehavior`
/// move o bicho um quadro adiante e avisa quando a atividade acabou.

import type { PetStats } from "@/lib/pet/state";

export const petPoses = ["quad", "sit", "lie"] as const;
export type PetPose = (typeof petPoses)[number];

export const petActivities = [
  "walk",
  "idle",
  "sit",
  "groom",
  "yawn",
  "stretch",
  "sleep",
  "chase",
  "eat",
  "cuddle",
  "beg"
] as const;
export type PetActivity = (typeof petActivities)[number];

type ActivityDef = {
  pose: PetPose;
  /** Anda em direção a `targetX` enquanto a atividade dura. */
  moves: boolean;
  minMs: number;
  maxMs: number;
};

export const activityDefs: Record<PetActivity, ActivityDef> = {
  walk: { pose: "quad", moves: true, minMs: 1200, maxMs: 9000 },
  idle: { pose: "quad", moves: false, minMs: 1800, maxMs: 4200 },
  sit: { pose: "sit", moves: false, minMs: 3000, maxMs: 8000 },
  groom: { pose: "sit", moves: false, minMs: 3200, maxMs: 5200 },
  yawn: { pose: "sit", moves: false, minMs: 1800, maxMs: 1800 },
  stretch: { pose: "quad", moves: false, minMs: 2200, maxMs: 2200 },
  sleep: { pose: "lie", moves: false, minMs: 20_000, maxMs: 60_000 },
  chase: { pose: "quad", moves: true, minMs: 600, maxMs: 9000 },
  eat: { pose: "quad", moves: false, minMs: 3400, maxMs: 3400 },
  cuddle: { pose: "sit", moves: false, minMs: 2600, maxMs: 2600 },
  beg: { pose: "sit", moves: false, minMs: 3400, maxMs: 6000 }
};

export const walkSpeed = 46;
export const chaseSpeed = 132;
/**
 * Margens do palco. Elas existem em função do tamanho do desenho: `x` é o
 * centro do bicho e `y` são as patas dele, então a margem lateral precisa ser
 * maior que meia largura (senão ele fica cortado no canto) e a de cima precisa
 * caber a altura inteira mais o cabeçalho fixo do app.
 */
export const cornerInset = 68;
export const topInset = 180;
export const bottomInset = 24;

export type BehaviorState = {
  activity: PetActivity;
  startedAt: number;
  endsAt: number;
  /** Centro do bicho no eixo horizontal. */
  x: number;
  /** Onde as patas dele encostam — o pé, não o topo. */
  y: number;
  targetX: number | null;
  targetY: number | null;
  facing: 1 | -1;
};

export type BehaviorContext = {
  stats: PetStats;
  stageWidth: number;
  stageHeight: number;
  /** Novelo largado na tela. `null` quando não há brinquedo. */
  toyX: number | null;
  toyY: number | null;
  /** Ponteiro do mouse. */
  cursorX: number | null;
  cursorY: number | null;
};

export type Point = { x: number; y: number };

type Random = () => number;

function between(random: Random, min: number, max: number) {
  return min + random() * (max - min);
}

function durationOf(activity: PetActivity, random: Random) {
  const def = activityDefs[activity];
  return between(random, def.minMs, def.maxMs);
}

export function clampToStage(point: Point, context: Pick<BehaviorContext, "stageWidth" | "stageHeight">): Point {
  const maxX = Math.max(cornerInset, context.stageWidth - cornerInset);
  const maxY = Math.max(topInset, context.stageHeight - bottomInset);

  return {
    x: Math.max(cornerInset, Math.min(maxX, point.x)),
    y: Math.max(topInset, Math.min(maxY, point.y))
  };
}

/** Dos quatro cantos da tela, aquele em que ele já está mais perto. */
export function nearestCorner(
  point: Point,
  context: Pick<BehaviorContext, "stageWidth" | "stageHeight">
): Point {
  const left = cornerInset;
  const right = Math.max(cornerInset, context.stageWidth - cornerInset);
  const top = topInset;
  const bottom = Math.max(topInset, context.stageHeight - bottomInset);

  return {
    x: Math.abs(point.x - left) <= Math.abs(point.x - right) ? left : right,
    y: Math.abs(point.y - top) <= Math.abs(point.y - bottom) ? top : bottom
  };
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function isSleepy(stats: PetStats) {
  return stats.energy < 22;
}

export function isStarving(stats: PetStats) {
  return stats.satiety < 25;
}

/** Escolhe entre atividades paradas com peso — nunca repete a anterior. */
function pickIdleActivity(previous: PetActivity, stats: PetStats, random: Random): PetActivity {
  const lowEnergy = stats.energy < 45;

  const weights: Array<[PetActivity, number]> = lowEnergy
    ? [
        ["walk", 22],
        ["sit", 26],
        ["groom", 12],
        ["yawn", 14],
        ["idle", 20],
        ["sleep", 6]
      ]
    : [
        ["walk", 42],
        ["sit", 16],
        ["groom", 10],
        ["stretch", 8],
        ["yawn", 4],
        ["idle", 20]
      ];

  const pool = weights.filter(([activity]) => activity === "walk" || activity !== previous);
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  let ticket = random() * total;

  for (const [activity, weight] of pool) {
    ticket -= weight;
    if (ticket <= 0) {
      return activity;
    }
  }

  return "idle";
}

/** Alvo quase na vertical não deve virar o bicho: só o eixo X manda na direção. */
function facingTowards(from: number, to: number, fallback: 1 | -1): 1 | -1 {
  if (Math.abs(to - from) < 6) return fallback;
  return to > from ? 1 : -1;
}

function start(
  activity: PetActivity,
  state: BehaviorState,
  now: number,
  random: Random,
  target: Point | null = null
): BehaviorState {
  return {
    activity,
    startedAt: now,
    endsAt: now + durationOf(activity, random),
    x: state.x,
    y: state.y,
    targetX: target ? target.x : null,
    targetY: target ? target.y : null,
    facing: target ? facingTowards(state.x, target.x, state.facing) : state.facing
  };
}

/**
 * Decide a próxima atividade. Necessidade urgente vem antes de vontade:
 * brinquedo na tela ganha de tudo, sono ganha de fome, fome ganha do ócio.
 */
export function chooseBehavior(
  state: BehaviorState,
  context: BehaviorContext,
  now: number,
  random: Random = Math.random
): BehaviorState {
  const { stats, stageWidth, stageHeight, toyX, toyY, cursorX, cursorY } = context;
  const here: Point = { x: state.x, y: state.y };

  if (toyX !== null && toyY !== null) {
    return start("chase", state, now, random, clampToStage({ x: toyX, y: toyY }, context));
  }

  if (isSleepy(stats)) {
    const corner = nearestCorner(here, context);

    // Longe do canto ele caminha até lá; no canto, apaga.
    return distance(here, corner) > 12
      ? start("walk", state, now, random, corner)
      : start("sleep", state, now, random);
  }

  if (isStarving(stats)) {
    return random() < 0.7 ? start("beg", state, now, random) : start("sit", state, now, random);
  }

  // Gato com carinho em dia repara em quem está por perto.
  if (cursorX !== null && cursorY !== null && stats.affection >= 55) {
    const cursor: Point = { x: cursorX, y: cursorY };
    const gap = distance(here, cursor);

    if (gap > 40 && gap < 320 && random() < 0.4) {
      return start("walk", state, now, random, clampToStage(cursor, context));
    }
  }

  const activity = pickIdleActivity(state.activity, stats, random);

  if (activity === "walk") {
    const target = clampToStage(
      {
        x: between(random, cornerInset, stageWidth - cornerInset),
        y: between(random, topInset, stageHeight - bottomInset)
      },
      context
    );

    // Passo curto demais não vale a caminhada: manda ele para longe.
    if (distance(here, target) > 70) {
      return start("walk", state, now, random, target);
    }

    return start(
      "walk",
      state,
      now,
      random,
      clampToStage(
        { x: state.x + (random() < 0.5 ? -180 : 180), y: state.y + (random() < 0.5 ? -110 : 110) },
        context
      )
    );
  }

  return start(activity, state, now, random);
}

/** Interrompe o que estiver acontecendo — usado por clique, petisco e novelo. */
export function interrupt(
  state: BehaviorState,
  activity: PetActivity,
  now: number,
  random: Random = Math.random,
  target: Point | null = null
): BehaviorState {
  return start(activity, state, now, random, target);
}

export type AdvanceResult = {
  state: BehaviorState;
  /** Verdadeiro quando a atividade terminou e cabe escolher outra. */
  done: boolean;
  /** Verdadeiro no quadro em que ele encosta no alvo (novelo pego, canto alcançado). */
  arrived: boolean;
};

/**
 * Move um quadro adiante. `deltaMs` vem do rAF, então o passo acompanha a taxa
 * de quadros real em vez de assumir 60fps.
 */
export function advanceBehavior(
  state: BehaviorState,
  context: BehaviorContext,
  now: number,
  deltaMs: number
): AdvanceResult {
  const def = activityDefs[state.activity];

  if (!def.moves || state.targetX === null || state.targetY === null) {
    return { state, done: now >= state.endsAt, arrived: false };
  }

  const speed = state.activity === "chase" ? chaseSpeed : walkSpeed;
  const step = (speed * deltaMs) / 1000;
  const target: Point = { x: state.targetX, y: state.targetY };
  const remaining = distance({ x: state.x, y: state.y }, target);
  const arrived = remaining <= step;

  const next = arrived
    ? target
    : {
        x: state.x + ((target.x - state.x) / remaining) * step,
        y: state.y + ((target.y - state.y) / remaining) * step
      };

  const inside = clampToStage(next, context);

  const moved: BehaviorState = {
    ...state,
    x: inside.x,
    y: inside.y,
    facing: arrived ? state.facing : facingTowards(state.x, target.x, state.facing)
  };

  return { state: moved, done: arrived || now >= state.endsAt, arrived };
}

export function createBehavior(x: number, y: number, now: number): BehaviorState {
  return {
    activity: "idle",
    startedAt: now,
    endsAt: now + 1200,
    x,
    y,
    targetX: null,
    targetY: null,
    facing: -1
  };
}

/** Frase curta que ele solta sozinho, de acordo com o que está fazendo. */
export function getIdleChatter(activity: PetActivity, petName: string): string | null {
  switch (activity) {
    case "beg":
      return "miau!";
    case "yawn":
      return "*bocejo*";
    case "sleep":
      return "zzz";
    case "cuddle":
      return `${petName} ronrona`;
    default:
      return null;
  }
}
