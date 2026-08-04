export type SimulationAnswerInput = {
  skillSlug?: string | null;
  skillName?: string | null;
  fallbackSlug?: string | null;
  fallbackName?: string | null;
  missionId?: string;
  skillId?: string | null;
  isCorrect: boolean;
};

export type SimulationSkillPerformance = {
  key: string;
  label: string;
  correctCount: number;
  wrongCount: number;
  total: number;
  accuracy: number;
};

function getGroup(answer: SimulationAnswerInput) {
  return {
    key: answer.skillSlug ?? answer.fallbackSlug ?? "sem-classificacao",
    label: answer.skillName ?? answer.fallbackName ?? answer.skillSlug ?? "Sem classificação"
  };
}

export function calculateSimulationResult(answers: SimulationAnswerInput[]) {
  const total = answers.length;
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const wrongCount = total - correctCount;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const bySkill = new Map<string, { label: string; correct: number; total: number }>();

  for (const answer of answers) {
    const group = getGroup(answer);
    const current = bySkill.get(group.key) ?? { label: group.label, correct: 0, total: 0 };
    current.total += 1;
    current.correct += answer.isCorrect ? 1 : 0;
    bySkill.set(group.key, current);
  }

  const skillResults = Array.from(bySkill.entries()).map(([key, result]) => {
    const wrong = result.total - result.correct;

    return {
      key,
      label: result.label,
      correctCount: result.correct,
      wrongCount: wrong,
      total: result.total,
      accuracy: result.total === 0 ? 0 : Math.round((result.correct / result.total) * 100)
    };
  });

  const strongSkills = skillResults
    .filter((result) => result.total > 0 && result.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

  const weakSkills = skillResults
    .filter((result) => result.total > 0 && result.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy || b.wrongCount - a.wrongCount);

  return {
    total,
    correctCount,
    wrongCount,
    score,
    skillResults,
    strongSkills,
    weakSkills
  };
}

export function buildReviewTargetsFromWrongAnswers(answers: SimulationAnswerInput[]) {
  const targets = new Map<string, { missionId: string; skillId?: string | null }>();

  for (const answer of answers) {
    if (answer.isCorrect || !answer.missionId) {
      continue;
    }

    const key = `${answer.missionId}:${answer.skillId ?? "none"}`;
    targets.set(key, {
      missionId: answer.missionId,
      skillId: answer.skillId ?? null
    });
  }

  return Array.from(targets.values());
}
