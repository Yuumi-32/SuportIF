import { notFound } from "next/navigation";

import { EmptyState } from "@/components/common/empty-state";
import { SimulationExam } from "@/components/simulations/simulation-exam";
import { requireRole } from "@/lib/auth/session";
import { getSimulationTypeLabel } from "@/lib/simulations/presentation";
import { getStudentSimulation } from "@/server/queries/simulations";

export const dynamic = "force-dynamic";

type Simulation = NonNullable<Awaited<ReturnType<typeof getStudentSimulation>>>;

function getRelationLabel(simulation: Simulation) {
  if (simulation.module) {
    return `Módulo: ${simulation.module.title}`;
  }

  if (simulation.track) {
    return `Trilha: ${simulation.track.title}`;
  }

  return "Simulado misto";
}

export default async function StudentSimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["STUDENT"]);
  const { id } = await params;
  const simulation = await getStudentSimulation(user.id, id);

  if (!simulation) {
    notFound();
  }

  return (
    <>
      {simulation.questions.length > 0 ? (
        <SimulationExam
          simulationId={simulation.id}
          title={simulation.title}
          typeLabel={getSimulationTypeLabel(simulation.type)}
          relationLabel={getRelationLabel(simulation)}
          questions={simulation.questions}
        />
      ) : (
        <EmptyState
          title="Simulado em preparação"
          description="As questões desta prática ainda não estão disponíveis."
        />
      )}
    </>
  );
}
