import type { MasteryStatus } from "@prisma/client";

export type MissionProgressInput = {
  attemptsCount: number;
  correctCount: number;
  exerciseCount: number;
};

export function calculateMissionMastery({
  attemptsCount,
  correctCount,
  exerciseCount
}: MissionProgressInput): MasteryStatus {
  if (attemptsCount <= 0) {
    return "NOT_STARTED";
  }

  if (exerciseCount > 0 && correctCount >= exerciseCount) {
    return "PROFICIENT";
  }

  if (attemptsCount >= 3 && correctCount === 0) {
    return "REVIEW";
  }

  if (correctCount > 0) {
    return "FAMILIAR";
  }

  return "IN_PROGRESS";
}

export function getMissionStudyStatus(input: MissionProgressInput) {
  if (input.exerciseCount > 0 && input.correctCount >= input.exerciseCount) {
    return "COMPLETED";
  }

  if (input.attemptsCount > 0) {
    return "IN_PROGRESS";
  }

  return "NOT_STARTED";
}

export function isMissionCompleted(status?: string | null, masteryStatus?: MasteryStatus | null) {
  return status === "COMPLETED" || masteryStatus === "PROFICIENT" || masteryStatus === "MASTERED";
}
