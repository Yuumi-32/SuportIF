import Link from "next/link";
import { SimulationType } from "@prisma/client";

import { AdminCheckbox, AdminSelect, AdminSubmitButton, AdminTextarea, AdminTextInput } from "@/components/admin/admin-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFormShell } from "@/components/admin/admin-form-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getSimulationTypeLabel } from "@/lib/simulations/presentation";
import { saveSimulationAction } from "@/server/actions/admin";
import { getAdminSimulations } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

const typeOptions = Object.values(SimulationType).map((type) => ({
  value: type,
  label: getSimulationTypeLabel(type)
}));

export default async function AdminSimulationsPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { simulations, tracks, modules, exercises, editing } = await getAdminSimulations(params.edit);
  const trackOptions = tracks.map((track) => ({ value: track.id, label: track.title }));
  const moduleOptions = modules.map((item) => ({ value: item.id, label: `${item.track.title} · ${item.title}` }));
  const selectedExercises = new Set(editing?.questions.map((question) => question.exerciseId) ?? []);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Simulados"
        description="Monte simulados básicos com exercícios existentes. A ordem segue a seleção exibida no formulário."
      />
      <Feedback error={params.error} saved={params.saved} />

      <div className="grid gap-6 2xl:grid-cols-[1fr_520px]">
        <AdminDataTable
          headers={["Simulado", "Tipo", "Escopo", "Questões", "Status", "Ações"]}
          rows={simulations.map((simulation) => [
            <div key="title" className="max-w-sm">
              <p className="font-semibold text-slate-950">{simulation.title}</p>
              <p className="line-clamp-2 text-xs text-slate-500">{simulation.description}</p>
            </div>,
            <Badge key="type" variant="outline">{getSimulationTypeLabel(simulation.type)}</Badge>,
            simulation.track?.title ?? simulation.module?.title ?? "Misto",
            simulation._count.questions,
            <AdminStatusBadge key="demo" active={simulation.isDemo} trueLabel="Demo" falseLabel="Real" />,
            <Link key="edit" className="font-semibold text-violet-700 hover:text-violet-900" href={`/admin/simulados?edit=${simulation.id}`}>
              Editar
            </Link>
          ])}
        />

        <AdminFormShell
          title={editing ? "Editar simulado" : "Criar simulado"}
          description="Não há editor avançado de prova nesta fase; selecione exercícios existentes no banco."
        >
          <form action={saveSimulationAction} className="space-y-4">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <AdminTextInput label="Título" name="title" defaultValue={editing?.title} />
            <AdminTextarea label="Descrição" name="description" defaultValue={editing?.description} rows={3} />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminSelect label="Tipo" name="type" defaultValue={editing?.type} options={typeOptions} />
              <AdminSelect label="Trilha" name="trackId" defaultValue={editing?.trackId} options={trackOptions} required={false} />
              <AdminSelect label="Módulo" name="moduleId" defaultValue={editing?.moduleId} options={moduleOptions} required={false} />
              <AdminCheckbox label="Demonstrativo" name="isDemo" defaultChecked={editing?.isDemo ?? true} />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <h2 className="font-semibold text-slate-950">Questões</h2>
                <p className="text-sm text-slate-600">Selecione pelo menos um exercício para compor o simulado.</p>
              </div>
              {exercises.map((exercise) => (
                <label
                  key={exercise.id}
                  className="flex gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="exerciseIds"
                    value={exercise.id}
                    defaultChecked={selectedExercises.has(exercise.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600"
                  />
                  <span>
                    <span className="block font-semibold text-slate-800">{exercise.prompt}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {exercise.mission.module.track.title} · {exercise.mission.module.title} · {exercise.mission.title}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <AdminSubmitButton>{editing ? "Salvar simulado" : "Criar simulado"}</AdminSubmitButton>
          </form>
        </AdminFormShell>
      </div>
    </div>
  );
}

function Feedback({ error, saved }: { error?: string; saved?: string }) {
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
        Não foi possível salvar. Verifique campos obrigatórios e selecione ao menos uma questão.
      </div>
    );
  }

  if (saved) {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">
        Alteração salva no banco.
      </div>
    );
  }

  return null;
}
