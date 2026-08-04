import { notFound } from "next/navigation";

import {
  SimulationResult,
  type ResultEvolutionItem,
  type ResultRecommendation,
  type ResultReviewItem,
  type ResultSkillItem
} from "@/components/simulations/simulation-result";
import { requireRole } from "@/lib/auth/session";
import {
  formatReviewDueText,
  getSkillDisplayName,
  parseSkillResults
} from "@/lib/simulations/presentation";
import {
  getSimulationAttemptHistory,
  getSimulationReviewRecommendations,
  getStudentSimulationResult
} from "@/server/queries/simulations";

export const dynamic = "force-dynamic";

function relativeDate(date: Date | null) {
  if (!date) {
    return "data não informada";
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((startOfDay(new Date()).getTime() - startOfDay(date).getTime()) / 86_400_000);

  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  return `há ${diff} dias`;
}

export default async function StudentSimulationResultPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const user = await requireRole(["STUDENT"]);
  const { id } = await params;
  const { attemptId } = await searchParams;
  const result = await getStudentSimulationResult(user.id, id, attemptId);

  if (!result) {
    notFound();
  }

  const wrongAnswers = result.answers.filter((answer) => !answer.isCorrect);
  const reviewPairs = wrongAnswers.map((answer) => ({
    missionId: answer.exercise.missionId,
    skillId: answer.exercise.skillId
  }));
  const [reviews, history] = await Promise.all([
    getSimulationReviewRecommendations(user.id, reviewPairs),
    getSimulationAttemptHistory(user.id, id)
  ]);

  const weakSkills = parseSkillResults(result.weakSkillsJson);
  const strongSkills = parseSkillResults(result.strongSkillsJson);
  const totalQuestions = result.simulation.questions.length || result.correctCount + result.wrongCount;

  const toSkillItem = (skill: ReturnType<typeof parseSkillResults>[number]): ResultSkillItem => ({
    label: getSkillDisplayName(skill),
    detail: `${skill.correctCount}/${skill.total} acertos · ${skill.accuracy}%`
  });

  let recommendations: ResultRecommendation[];
  if (reviews.length > 0) {
    recommendations = reviews.slice(0, 4).map((review) => ({
      title: review.mission.title,
      text: `${review.mission.module.track.title} · ${review.mission.module.title}${
        review.skill ? ` · ${review.skill.name}` : ""
      } · ${formatReviewDueText(review.dueAt)}`
    }));
  } else if (weakSkills.length > 0) {
    recommendations = weakSkills.slice(0, 4).map((skill) => ({
      text: `Revise ${getSkillDisplayName(skill)} antes de refazer o simulado.`
    }));
  } else {
    recommendations = [
      { text: "O resultado não gerou pontos fracos. Mantenha a revisão espaçada para consolidar." }
    ];
  }

  const review: ResultReviewItem[] = result.answers.map((answer) => {
    const correctOption = answer.exercise.options[0];
    return {
      id: answer.id,
      prompt: answer.exercise.prompt,
      isCorrect: answer.isCorrect,
      context: `${answer.exercise.mission.module.track.title} · ${answer.exercise.mission.title}`,
      your: answer.selectedOption?.text ?? "Sem resposta",
      correct: correctOption ? correctOption.text : null,
      feedback: answer.selectedOption?.feedback ?? correctOption?.feedback ?? "",
      missionId: answer.exercise.mission.id,
      missionTitle: answer.exercise.mission.title
    };
  });

  const recentHistory = history.slice(-6);
  const evolution: ResultEvolutionItem[] = recentHistory.map((attempt, index) => ({
    dateLabel: relativeDate(attempt.finishedAt),
    score: attempt.score,
    delta: index > 0 ? attempt.score - recentHistory[index - 1].score : null
  }));

  let evolutionSummary = "";
  if (recentHistory.length > 1) {
    const delta = recentHistory[recentHistory.length - 1].score - recentHistory[recentHistory.length - 2].score;
    evolutionSummary =
      delta > 0
        ? `Subiu ${delta} pontos vs. a tentativa anterior.`
        : delta < 0
          ? `Caiu ${Math.abs(delta)} pontos vs. a anterior.`
          : "Manteve o mesmo desempenho.";
  }

  return (
    <SimulationResult
      simulationId={result.simulationId}
      title={result.simulation.title}
      finishedLabel={result.finishedAt ? `registrado em ${result.finishedAt.toLocaleString("pt-BR")}` : "registrado"}
      score={result.score}
      correctCount={result.correctCount}
      wrongCount={result.wrongCount}
      totalQuestions={totalQuestions}
      strongSkills={strongSkills.map(toSkillItem)}
      weakSkills={weakSkills.map(toSkillItem)}
      recommendations={recommendations}
      review={review}
      evolution={evolution}
      evolutionSummary={evolutionSummary}
    />
  );
}
