import { pageLayout } from "@/lib/appearance/layout";
import { parseAppearance } from "@/lib/appearance/settings";
import { StudentSimulations, type StudentSimulationItem } from "@/components/simulations/student-simulations";
import { requireRole } from "@/lib/auth/session";
import {
  getBestSimulationScore,
  getSimulationDescriptionText,
  getSimulationRecommendationStatus,
  getSimulationTypeLabel
} from "@/lib/simulations/presentation";
import { getStudentSimulations } from "@/server/queries/simulations";

export const dynamic = "force-dynamic";

type Simulation = Awaited<ReturnType<typeof getStudentSimulations>>[number];

function getRelationLabel(simulation: Simulation) {
  if (simulation.module) {
    return `Módulo: ${simulation.module.title}`;
  }

  if (simulation.track) {
    return `Trilha: ${simulation.track.title}`;
  }

  return "Simulado misto";
}

function toSimulationItem(simulation: Simulation): StudentSimulationItem {
  const lastAttempt = simulation.attempts[0] ?? null;
  const bestScore = getBestSimulationScore(simulation.attempts);

  return {
    id: simulation.id,
    title: simulation.title,
    description: getSimulationDescriptionText(simulation.description),
    typeLabel: getSimulationTypeLabel(simulation.type),
    relationLabel: getRelationLabel(simulation),
    status: getSimulationRecommendationStatus(simulation.attempts),
    questionCount: simulation.questions.length,
    attemptCount: simulation.attempts.length,
    bestScore,
    lastScore: lastAttempt ? lastAttempt.score : null,
    lastAttemptId: lastAttempt ? lastAttempt.id : null
  };
}

export default async function StudentSimulationsPage({
  searchParams
}: {
  searchParams: Promise<{ editar?: string | string[] }>;
}) {
  const user = await requireRole(["STUDENT"]);
  const { editar } = await searchParams;
  const appearance = parseAppearance(user.profile?.appearance);
  const simulations = await getStudentSimulations(user.id);

  return (
    <StudentSimulations
      simulations={simulations.map(toSimulationItem)}
      layout={pageLayout(appearance.layout, "simulados")}
      freeLayout={appearance.freeLayout}
      startEditing={(Array.isArray(editar) ? editar[0] : editar) === "1"}
    />
  );
}
