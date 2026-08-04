export type SubmittedSimulationAnswer = {
  exerciseId: string;
  selectedOptionId: string;
};

export function findMissingSimulationAnswers(
  expectedExerciseIds: string[],
  submittedAnswers: SubmittedSimulationAnswer[]
) {
  const answeredExerciseIds = new Set(
    submittedAnswers
      .filter((answer) => answer.selectedOptionId.trim().length > 0)
      .map((answer) => answer.exerciseId)
  );

  return expectedExerciseIds.filter((exerciseId) => !answeredExerciseIds.has(exerciseId));
}

export function hasDuplicateSimulationAnswers(submittedAnswers: SubmittedSimulationAnswer[]) {
  const seen = new Set<string>();

  for (const answer of submittedAnswers) {
    if (seen.has(answer.exerciseId)) {
      return true;
    }

    seen.add(answer.exerciseId);
  }

  return false;
}
