import Link from "next/link";
import { MissionDifficulty } from "@prisma/client";

import { AdminCheckbox, AdminSelect, AdminSubmitButton, AdminTextarea, AdminTextInput } from "@/components/admin/admin-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFormShell } from "@/components/admin/admin-form-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getMissionDifficultyLabel } from "@/lib/learning/presentation";
import { saveMissionAction } from "@/server/actions/admin";
import { getAdminMissions } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

const difficultyOptions = Object.values(MissionDifficulty).map((difficulty) => ({
  value: difficulty,
  label: getMissionDifficultyLabel(difficulty)
}));

export default async function AdminMissionsPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { missions, modules, editing } = await getAdminMissions(params.edit);
  const moduleOptions = modules.map((item) => ({
    value: item.id,
    label: `${item.track.title} · ${item.title}`
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Missões"
        description="Gerencie conteúdo em camadas, objetivo, explicações, desafio, resumo, XP e dificuldade."
      />
      <Feedback error={params.error} saved={params.saved} />

      <div className="grid gap-6 2xl:grid-cols-[1fr_500px]">
        <AdminDataTable
          headers={["Missão", "Módulo", "Dificuldade", "XP", "Tempo", "Status", "Ações"]}
          rows={missions.map((mission) => [
            <div key="title" className="max-w-sm">
              <p className="font-semibold text-slate-950">{mission.title}</p>
              <p className="line-clamp-2 text-xs text-slate-500">{mission.shortDescription}</p>
            </div>,
            <div key="module">
              <p className="font-semibold text-slate-700">{mission.module.title}</p>
              <p className="text-xs text-slate-500">{mission.module.track.title}</p>
            </div>,
            <Badge key="difficulty" variant="outline">{getMissionDifficultyLabel(mission.difficulty)}</Badge>,
            mission.xpReward,
            `${mission.estimatedMinutes} min`,
            <AdminStatusBadge key="demo" active={mission.isDemo} trueLabel="Demo" falseLabel="Real" />,
            <Link key="edit" className="font-semibold text-violet-700 hover:text-violet-900" href={`/admin/missoes?edit=${mission.id}`}>
              Editar
            </Link>
          ])}
        />

        <AdminFormShell
          title={editing ? "Editar missão" : "Criar missão"}
          description="Todo conteúdo novo pode ser marcado como demonstrativo enquanto não houver material oficial fornecido."
        >
          <form action={saveMissionAction} className="space-y-4">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <AdminSelect label="Módulo" name="moduleId" defaultValue={editing?.moduleId} options={moduleOptions} />
            <AdminTextInput label="Título" name="title" defaultValue={editing?.title} />
            <AdminTextInput label="Slug" name="slug" defaultValue={editing?.slug} />
            <AdminTextarea label="Descrição curta" name="shortDescription" defaultValue={editing?.shortDescription} rows={3} />
            <AdminTextarea label="Objetivo" name="objective" defaultValue={editing?.objective} rows={3} />
            <AdminTextarea label="Explicação rápida" name="quickExplanation" defaultValue={editing?.quickExplanation} rows={3} />
            <AdminTextarea label="Explicação mastigada" name="detailedExplanation" defaultValue={editing?.detailedExplanation} />
            <AdminTextarea label="Analogia" name="analogy" defaultValue={editing?.analogy} rows={3} />
            <AdminTextarea label="Exemplo prático" name="practicalExample" defaultValue={editing?.practicalExample} rows={3} />
            <AdminTextarea label="Exercício guiado" name="guidedExercisePrompt" defaultValue={editing?.guidedExercisePrompt} rows={3} />
            <AdminTextarea label="Desafio sem ajuda" name="challengePrompt" defaultValue={editing?.challengePrompt} rows={3} />
            <AdminTextarea label="Resumo" name="summary" defaultValue={editing?.summary} rows={3} />
            <AdminTextarea
              label="Pontos de atenção, um por linha"
              name="attentionPoints"
              defaultValue={editing?.attentionPoints}
              rows={4}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminSelect label="Dificuldade" name="difficulty" defaultValue={editing?.difficulty} options={difficultyOptions} />
              <AdminTextInput label="XP" name="xpReward" type="number" defaultValue={editing?.xpReward ?? 40} />
              <AdminTextInput label="Tempo estimado" name="estimatedMinutes" type="number" defaultValue={editing?.estimatedMinutes ?? 8} />
              <AdminTextInput label="Ordem" name="order" type="number" defaultValue={editing?.order ?? 1} />
            </div>
            <AdminCheckbox label="Demonstrativa" name="isDemo" defaultChecked={editing?.isDemo ?? true} />
            <AdminSubmitButton>{editing ? "Salvar missão" : "Criar missão"}</AdminSubmitButton>
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
        Não foi possível salvar. Verifique os campos obrigatórios e slug duplicado no módulo.
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
