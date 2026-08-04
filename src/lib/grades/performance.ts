/// Cálculos da página "Notas": mapa de atividade, sequências de estudo, notas
/// por matéria e pontos fracos.
///
/// Tudo trabalha com chaves de dia no formato "YYYY-MM-DD" geradas no servidor.
/// Assim o gráfico não muda de valor quando o componente hidrata no navegador
/// (o fuso do usuário não entra na conta duas vezes).

export const gradeRanges = ["todos", "30d", "7d"] as const;

export type GradeRange = (typeof gradeRanges)[number];

export type StudyEvent = {
  dayKey: string;
  hour: number;
};

export type AnswerEvent = StudyEvent & {
  isCorrect: boolean;
  source: "EXERCICIO" | "SIMULADO";
  skillKey: string;
  skillLabel: string;
  missionId: string | null;
  missionTitle: string;
};

export type SkillPerformanceStatus = "FORTE" | "ATENCAO" | "FRAGIL" | "SEM_DADOS";

export type SkillPerformance = {
  key: string;
  label: string;
  correctCount: number;
  wrongCount: number;
  total: number;
  accuracy: number;
  grade: number;
  status: SkillPerformanceStatus;
  /** Missão em que o aluno mais errou dentro dessa matéria, para virar atalho. */
  weakestMission: { id: string; title: string; wrongCount: number } | null;
};

export type HeatmapDay = {
  dayKey: string;
  count: number;
  level: number;
  isFuture: boolean;
};

export type Heatmap = {
  weeks: HeatmapDay[][];
  total: number;
  activeDays: number;
  maxCount: number;
};

/** Mínimo de respostas para uma matéria virar nota confiável. */
const MIN_ANSWERS_FOR_STATUS = 3;

export function toDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toUtcTime(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function shiftDayKey(dayKey: string, days: number) {
  const shifted = new Date(toUtcTime(dayKey) + days * 24 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${shifted.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** 0 = domingo, 6 = sábado. */
export function dayKeyWeekday(dayKey: string) {
  return new Date(toUtcTime(dayKey)).getUTCDay();
}

export function diffInDays(fromDayKey: string, toDayKey: string) {
  return Math.round((toUtcTime(toDayKey) - toUtcTime(fromDayKey)) / (24 * 60 * 60 * 1000));
}

/** Primeiro dia incluído no filtro. `null` quando o filtro é "todos". */
export function rangeStartDayKey(range: GradeRange, todayKey: string) {
  if (range === "7d") {
    return shiftDayKey(todayKey, -6);
  }

  if (range === "30d") {
    return shiftDayKey(todayKey, -29);
  }

  return null;
}

export function filterByRange<T extends { dayKey: string }>(
  items: T[],
  range: GradeRange,
  todayKey: string
) {
  const startDayKey = rangeStartDayKey(range, todayKey);

  if (!startDayKey) {
    return items;
  }

  return items.filter((item) => item.dayKey >= startDayKey && item.dayKey <= todayKey);
}

export function countByDay(events: StudyEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.dayKey, (counts.get(event.dayKey) ?? 0) + 1);
  }

  return counts;
}

/**
 * Intensidade de 0 a 4 de um dia no mapa de atividade. A escala acompanha o
 * melhor dia do período para o quadro não ficar todo apagado em quem estuda
 * pouco por dia.
 */
export function heatmapLevel(count: number, maxCount: number) {
  if (count <= 0) {
    return 0;
  }

  if (maxCount <= 1) {
    return 4;
  }

  return Math.max(1, Math.min(4, Math.ceil((count / maxCount) * 4)));
}

/**
 * Monta o quadro estilo GitHub: uma coluna por semana (domingo a sábado),
 * terminando na semana do dia atual.
 */
export function buildHeatmap(events: StudyEvent[], todayKey: string, weeks = 26): Heatmap {
  const counts = countByDay(events);
  const endDayKey = shiftDayKey(todayKey, 6 - dayKeyWeekday(todayKey));
  const startDayKey = shiftDayKey(endDayKey, -(weeks * 7 - 1));
  const grid: HeatmapDay[][] = [];

  let total = 0;
  let activeDays = 0;
  let maxCount = 0;

  for (let week = 0; week < weeks; week += 1) {
    const days: HeatmapDay[] = [];

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const dayKey = shiftDayKey(startDayKey, week * 7 + weekday);
      const count = counts.get(dayKey) ?? 0;

      if (count > 0) {
        total += count;
        activeDays += 1;
        maxCount = Math.max(maxCount, count);
      }

      days.push({ dayKey, count, level: 0, isFuture: dayKey > todayKey });
    }

    grid.push(days);
  }

  for (const week of grid) {
    for (const day of week) {
      day.level = heatmapLevel(day.count, maxCount);
    }
  }

  return { weeks: grid, total, activeDays, maxCount };
}

/**
 * Sequência de dias estudados. A sequência atual continua valendo se o aluno
 * ainda não estudou hoje mas estudou ontem — o dia só "quebra" quando passa.
 */
export function calculateStreaks(dayKeys: string[], todayKey: string) {
  const unique = Array.from(new Set(dayKeys)).sort();

  if (unique.length === 0) {
    return { current: 0, longest: 0, activeDays: 0 };
  }

  let longest = 1;
  let run = 1;

  for (let index = 1; index < unique.length; index += 1) {
    if (diffInDays(unique[index - 1], unique[index]) === 1) {
      run += 1;
    } else {
      run = 1;
    }

    longest = Math.max(longest, run);
  }

  const active = new Set(unique);
  let current = 0;
  let cursor = active.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);

  while (active.has(cursor)) {
    current += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  return { current, longest, activeDays: unique.length };
}

/** Hora do dia em que o aluno mais estuda. */
export function calculatePeakHour(events: StudyEvent[]) {
  if (events.length === 0) {
    return null;
  }

  const byHour = new Map<number, number>();

  for (const event of events) {
    byHour.set(event.hour, (byHour.get(event.hour) ?? 0) + 1);
  }

  const [hour, count] = Array.from(byHour.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];

  return { hour, count };
}

/** Converte acerto (%) em nota de 0 a 10. */
export function toGrade(accuracy: number) {
  return Math.round(accuracy) / 10;
}

export function classifySkill(accuracy: number, total: number): SkillPerformanceStatus {
  if (total < MIN_ANSWERS_FOR_STATUS) {
    return "SEM_DADOS";
  }

  if (accuracy >= 80) {
    return "FORTE";
  }

  if (accuracy >= 60) {
    return "ATENCAO";
  }

  return "FRAGIL";
}

export function summarizeAnswers(answers: AnswerEvent[]) {
  const total = answers.length;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  return {
    total,
    correctCount,
    wrongCount: total - correctCount,
    accuracy,
    grade: toGrade(accuracy)
  };
}

/** Notas por matéria, da mais frágil para a mais firme. */
export function summarizeSkillPerformance(answers: AnswerEvent[]): SkillPerformance[] {
  const grouped = new Map<
    string,
    {
      label: string;
      correctCount: number;
      total: number;
      missions: Map<string, { id: string; title: string; wrongCount: number }>;
    }
  >();

  for (const answer of answers) {
    const current = grouped.get(answer.skillKey) ?? {
      label: answer.skillLabel,
      correctCount: 0,
      total: 0,
      missions: new Map<string, { id: string; title: string; wrongCount: number }>()
    };

    current.total += 1;
    current.correctCount += answer.isCorrect ? 1 : 0;

    if (!answer.isCorrect && answer.missionId) {
      const mission = current.missions.get(answer.missionId) ?? {
        id: answer.missionId,
        title: answer.missionTitle,
        wrongCount: 0
      };
      mission.wrongCount += 1;
      current.missions.set(answer.missionId, mission);
    }

    grouped.set(answer.skillKey, current);
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => {
      const accuracy = value.total === 0 ? 0 : Math.round((value.correctCount / value.total) * 100);
      const weakestMission =
        Array.from(value.missions.values()).sort(
          (a, b) => b.wrongCount - a.wrongCount || a.title.localeCompare(b.title)
        )[0] ?? null;

      return {
        key,
        label: value.label,
        correctCount: value.correctCount,
        wrongCount: value.total - value.correctCount,
        total: value.total,
        accuracy,
        grade: toGrade(accuracy),
        status: classifySkill(accuracy, value.total),
        weakestMission
      };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.wrongCount - a.wrongCount || a.label.localeCompare(b.label));
}

/** Matérias que puxam a nota para baixo, já em ordem de prioridade. */
export function selectWeakPoints(performance: SkillPerformance[], limit = 4) {
  return performance
    .filter((item) => item.status === "FRAGIL" || item.status === "ATENCAO")
    .slice(0, limit);
}

export function selectStrongPoints(performance: SkillPerformance[], limit = 4) {
  return performance
    .filter((item) => item.status === "FORTE")
    .slice()
    .reverse()
    .slice(0, limit);
}
