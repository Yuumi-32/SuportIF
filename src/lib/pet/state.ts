/// Regras do bichinho de estimação, sem banco e sem React.
///
/// Dois princípios sustentam o resto do arquivo:
///
/// 1. O tempo é quem move os medidores. O banco guarda como eles estavam em
///    `syncedAt`; o valor "de agora" é sempre calculado na leitura. Isso evita
///    rotina agendada no servidor e mantém o pet vivo entre visitas.
/// 2. O estudo é quem alimenta o cuidado. Petisco não cai do céu: sai do que a
///    pessoa fez hoje na plataforma. O carinho é de graça — o que custa é a
///    comida.

export const petActions = ["FEED", "PLAY", "PET"] as const;
export type PetAction = (typeof petActions)[number];

export type PetStats = {
  satiety: number;
  energy: number;
  affection: number;
};

export type PetTimestamps = {
  syncedAt: Date;
  lastFedAt: Date | null;
  lastPlayedAt: Date | null;
  lastPettedAt: Date | null;
};

export type PetState = PetStats & PetTimestamps;

/** O que o pet enxerga do progresso real de quem cuida dele. */
export type StudySignals = {
  streak: number;
  level: number;
  /** Missões concluídas + revisões respondidas + simulados enviados hoje. */
  activitiesToday: number;
  overdueReviews: number;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Ritmo por hora. Energia é a única que sobe sozinha: o pet descansa. */
const satietyDecayPerHour = 5;
const affectionDecayPerHour = 3;
const energyRecoveryPerHour = 7;

/** Ninguém volta de uma semana fora com o pet zerado. */
const minimumIdleSatiety = 8;
const minimumIdleAffection = 5;

export const petActionCooldownMs: Record<PetAction, number> = {
  FEED: 45 * MINUTE,
  PLAY: 15 * MINUTE,
  PET: 45_000
};

/** Teto de petiscos por dia, para o carinho não virar farra de ração. */
export const maxDailyTreats = 6;
/** Um petisco sai de graça por dia; o resto é conquistado estudando. */
export const baseDailyTreats = 1;

const playEnergyFloor = 25;
const feedSatietyCeiling = 88;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Rotina de estudo acalma o bicho: com ofensiva em pé ele sente menos fome e
 * carência. É o vínculo mais direto entre progresso e cuidado.
 */
export function getRoutineRelief(streak: number) {
  if (streak >= 7) return 0.6;
  if (streak >= 3) return 0.8;
  return 1;
}

/** Onde os medidores estão agora, dado o tempo parado desde `syncedAt`. */
export function applyElapsedTime(state: PetState, now: Date, streak = 0): PetStats {
  const hours = Math.max(0, (now.getTime() - state.syncedAt.getTime()) / HOUR);

  if (hours === 0) {
    return { satiety: clamp(state.satiety), energy: clamp(state.energy), affection: clamp(state.affection) };
  }

  const relief = getRoutineRelief(streak);

  return {
    satiety: Math.max(
      Math.min(state.satiety, minimumIdleSatiety),
      clamp(state.satiety - satietyDecayPerHour * relief * hours)
    ),
    affection: Math.max(
      Math.min(state.affection, minimumIdleAffection),
      clamp(state.affection - affectionDecayPerHour * relief * hours)
    ),
    energy: clamp(state.energy + energyRecoveryPerHour * hours)
  };
}

/** Média dos três medidores — é o número grande que a tela mostra. */
export function getWellbeing(stats: PetStats) {
  return Math.round((stats.satiety + stats.energy + stats.affection) / 3);
}

export function getTreatAllowance(signals: Pick<StudySignals, "activitiesToday">) {
  return Math.min(baseDailyTreats + signals.activitiesToday, maxDailyTreats);
}

export function getAvailableTreats(
  signals: Pick<StudySignals, "activitiesToday">,
  treatsUsedToday: number
) {
  return Math.max(getTreatAllowance(signals) - treatsUsedToday, 0);
}

function lastUseOf(state: PetState, action: PetAction) {
  if (action === "FEED") return state.lastFedAt;
  if (action === "PLAY") return state.lastPlayedAt;
  return state.lastPettedAt;
}

/** Quanto falta para a ação liberar de novo. Zero quer dizer disponível. */
export function getCooldownRemainingMs(state: PetState, action: PetAction, now: Date) {
  const last = lastUseOf(state, action);

  if (!last) {
    return 0;
  }

  return Math.max(0, petActionCooldownMs[action] - (now.getTime() - last.getTime()));
}

export function formatWait(ms: number) {
  const minutes = Math.ceil(ms / MINUTE);

  if (ms < MINUTE) {
    return `${Math.ceil(ms / 1000)}s`;
  }

  return minutes < 60 ? `${minutes} min` : `${Math.ceil(minutes / 60)} h`;
}

export type PetActionResult =
  | { ok: true; state: PetState; message: string; treatsSpent: number }
  | { ok: false; message: string };

/**
 * Aplica uma ação de cuidado sobre o estado já envelhecido até `now`.
 *
 * A recusa é parte do brinquedo: gato empanturrado não come e gato exausto não
 * brinca. Cada recusa devolve o texto que a tela mostra.
 */
export function applyPetAction(input: {
  state: PetState;
  action: PetAction;
  now: Date;
  signals: StudySignals;
  treatsUsedToday: number;
  petName: string;
}): PetActionResult {
  const { action, now, signals, treatsUsedToday, petName } = input;
  const stats = applyElapsedTime(input.state, now, signals.streak);
  const state: PetState = { ...input.state, ...stats, syncedAt: now };

  const waiting = getCooldownRemainingMs(input.state, action, now);

  if (waiting > 0) {
    return {
      ok: false,
      message:
        action === "PET"
          ? `${petName} ainda está aproveitando o carinho. Tente em ${formatWait(waiting)}.`
          : `Espere ${formatWait(waiting)} para repetir.`
    };
  }

  if (action === "FEED") {
    if (stats.satiety > feedSatietyCeiling) {
      return { ok: false, message: `${petName} está empanturrado e recusa o petisco.` };
    }

    if (getAvailableTreats(signals, treatsUsedToday) <= 0) {
      return {
        ok: false,
        message: "Acabaram os petiscos de hoje. Conclua uma missão ou revisão para ganhar mais."
      };
    }

    return {
      ok: true,
      treatsSpent: 1,
      message: `${petName} devorou o petisco e ronronou.`,
      state: {
        ...state,
        satiety: clamp(stats.satiety + 28),
        affection: clamp(stats.affection + 4),
        energy: clamp(stats.energy + 2),
        lastFedAt: now
      }
    };
  }

  if (action === "PLAY") {
    if (stats.energy < playEnergyFloor) {
      return { ok: false, message: `${petName} está sem energia. Deixe ele cochilar um pouco.` };
    }

    return {
      ok: true,
      treatsSpent: 0,
      message: `${petName} correu atrás do novelo e voltou ofegante.`,
      state: {
        ...state,
        affection: clamp(stats.affection + 14),
        energy: clamp(stats.energy - 16),
        satiety: clamp(stats.satiety - 6),
        lastPlayedAt: now
      }
    };
  }

  return {
    ok: true,
    treatsSpent: 0,
    message: `${petName} fechou os olhos e ronronou.`,
    state: {
      ...state,
      affection: clamp(stats.affection + 7),
      energy: clamp(stats.energy + 1),
      lastPettedAt: now
    }
  };
}

export const petMoods = [
  "hungry",
  "sleepy",
  "lonely",
  "worried",
  "proud",
  "playful",
  "content"
] as const;
export type PetMood = (typeof petMoods)[number];

/**
 * Necessidade urgente vem antes de leitura de progresso: não adianta o pet
 * comemorar a ofensiva enquanto está com fome.
 */
export function getPetMood(stats: PetStats, signals: StudySignals): PetMood {
  if (stats.satiety < 30) return "hungry";
  if (stats.energy < 25) return "sleepy";
  if (stats.affection < 30) return "lonely";
  if (signals.overdueReviews > 0) return "worried";
  if (signals.activitiesToday > 0) return "proud";
  if (stats.affection >= 70 && stats.energy >= 60) return "playful";
  return "content";
}

export const petMoodLabels: Record<PetMood, string> = {
  hungry: "Com fome",
  sleepy: "Sonolento",
  lonely: "Carente",
  worried: "De orelha em pé",
  proud: "Orgulhoso",
  playful: "Elétrico",
  content: "Tranquilo"
};

/** A fala do pet na tela. É onde o progresso vira texto. */
export function getPetMoodMessage(mood: PetMood, petName: string, signals: StudySignals) {
  switch (mood) {
    case "hungry":
      return `${petName} está com fome e olhando fixo para você.`;
    case "sleepy":
      return `${petName} está sonolento e só quer um canto quentinho.`;
    case "lonely":
      return `${petName} está carente. Faz tempo que ninguém passa a mão nele.`;
    case "worried":
      return signals.overdueReviews === 1
        ? `${petName} está inquieto: você tem 1 revisão atrasada.`
        : `${petName} está inquieto: você tem ${signals.overdueReviews} revisões atrasadas.`;
    case "proud":
      return signals.streak >= 3
        ? `${petName} viu você estudar hoje e está todo prosa com seus ${signals.streak} dias de ofensiva.`
        : `${petName} viu você estudar hoje e não larga do seu pé.`;
    case "playful":
      return `${petName} está elétrico e empurrando o novelo na sua direção.`;
    default:
      return `${petName} está tranquilo, deitado perto do seu caderno.`;
  }
}

/** Como o pet aparece na tela: o humor manda no rosto e no rabo. */
export function getPetPose(mood: PetMood) {
  return {
    eyes: mood === "sleepy" ? "sleepy" : mood === "playful" || mood === "proud" ? "happy" : "open",
    tailSpeedSeconds: mood === "playful" ? 1.6 : mood === "sleepy" ? 7 : 4.5,
    alert: mood === "worried" || mood === "hungry"
  } as const;
}

/** Texto da plaquinha da coleira: o nível de quem cuida dele. */
export function getCollarLabel(level: number) {
  return level > 99 ? "99+" : String(Math.max(1, Math.round(level)));
}
