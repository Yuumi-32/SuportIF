import Link from "next/link";
import { ExerciseType, MissionDifficulty } from "@prisma/client";

import { AdminCheckbox, AdminSelect, AdminSubmitButton, AdminTextarea, AdminTextInput } from "@/components/admin/admin-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFormShell } from "@/components/admin/admin-form-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/session";
import { getMissionDifficultyLabel } from "@/lib/learning/presentation";
import { saveExerciseAction } from "@/server/actions/admin";
import { getAdminExercises } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

const difficultyOptions = Object.values(MissionDifficulty).map((difficulty) => ({
  value: difficulty,
  label: getMissionDifficultyLabel(difficulty)
}));

const typeOptions = Object.values(ExerciseType).map((type) => ({ value: type, label: type }));

export default async function AdminExercisesPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { exercises, missions, skills, editing } = await getAdminExercises(params.edit);
  const missionOptions = missions.map((mission) => ({
    value: mission.id,
    label: `${mission.module.track.title} · ${mission.module.title} · ${mission.title}`
  }));
  const skillOptions = skills.map((skill) => ({ value: skill.id, label: skill.name }));
  const optionRows = buildOptionRows(editing?.options ?? []);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Exercícios"
        description="Cadastre exercícios de múltipla escolha com alternativas, feedback e uma única resposta correta."
      />
      <Feedback error={params.error} saved={params.saved} />

      <div className="grid gap-6 2xl:grid-cols-[1fr_520px]">
        <AdminDataTable
          headers={["Exercício", "Missão", "Tipo", "Skill", "Alternativas", "Status", "Ações"]}
          rows={exercises.map((exercise) => [
            <div key="prompt" className="max-w-sm">
              <p className="line-clamp-2 font-semibold text-slate-950">{exercise.prompt}</p>
              <p className="text-xs text-slate-500">{getMissionDifficultyLabel(exercise.difficulty)}</p>
            </div>,
            <div key="mission">
              <p className="font-semibold text-slate-700">{exercise.mission.title}</p>
              <p className="text-xs text-slate-500">{exercise.mission.module.track.title}</p>
            </div>,
            <Badge key="type" variant="outline">{exercise.type}</Badge>,
            exercise.skill?.name ?? "Sem skill",
            exercise._count.options,
            <AdminStatusBadge key="demo" active={exercise.isDemo} trueLabel="Demo" falseLabel="Real" />,
            <Link key="edit" className="font-semibold text-violet-700 hover:text-violet-900" href={`/admin/exercicios?edit=${exercise.id}`}>
              Editar
            </Link>
          ])}
        />

        <AdminFormShell
          title={editing ? "Editar exercício" : "Criar exercício"}
          description="Alternativas usadas em tentativas não são apagadas silenciosamente; o admin recebe erro se tentar remover uma opção com dependências."
        >
          <form action={saveExerciseAction} className="space-y-4">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <AdminSelect label="Missão" name="missionId" defaultValue={editing?.missionId} options={missionOptions} />
            <AdminSelect label="Tipo" name="type" defaultValue={editing?.type ?? "MULTIPLE_CHOICE"} options={typeOptions} />
            <AdminTextarea label="Enunciado" name="prompt" defaultValue={editing?.prompt} rows={4} />
            <AdminTextarea label="Explicação" name="explanation" defaultValue={editing?.explanation} />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminSelect label="Dificuldade" name="difficulty" defaultValue={editing?.difficulty} options={difficultyOptions} />
              <AdminSelect label="Skill" name="skillId" defaultValue={editing?.skillId} options={skillOptions} required={false} />
              <AdminTextInput label="Ordem" name="order" type="number" defaultValue={editing?.order ?? 1} />
              <AdminCheckbox label="Demonstrativo" name="isDemo" defaultChecked={editing?.isDemo ?? true} />
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <h2 className="font-semibold text-slate-950">Alternativas</h2>
                <p className="text-sm text-slate-600">Preencha pelo menos duas e marque exatamente uma como correta.</p>
              </div>
              {optionRows.map((option, index) => (
                <div key={option.key} className="rounded-md border border-slate-200 bg-white p-3">
                  <input type="hidden" name="optionId" value={option.id} />
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOptionIndex"
                      value={index}
                      defaultChecked={option.isCorrect}
                      required
                      className="h-4 w-4 text-violet-700 focus:ring-violet-600"
                    />
                    <span className="text-sm font-semibold text-slate-700">Alternativa correta</span>
                  </div>
                  <div className="space-y-3">
                    <Input name="optionText" defaultValue={option.text} placeholder={`Alternativa ${index + 1}`} />
                    <textarea
                      name="optionFeedback"
                      defaultValue={option.feedback}
                      placeholder="Feedback específico dessa alternativa"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
                </div>
              ))}
            </div>
            <AdminSubmitButton>{editing ? "Salvar exercício" : "Criar exercício"}</AdminSubmitButton>
          </form>
        </AdminFormShell>
      </div>
    </div>
  );
}

function buildOptionRows(
  options: Array<{ id: string; text: string; feedback: string; isCorrect: boolean }>
) {
  const rows = options.map((option) => ({ ...option, key: option.id }));

  while (rows.length < 4) {
    rows.push({ id: "", text: "", feedback: "", isCorrect: rows.length === 0, key: `new-${rows.length}` });
  }

  return rows;
}

function Feedback({ error, saved }: { error?: string; saved?: string }) {
  if (error) {
    const message =
      error === "option-dependencies"
        ? "Não foi possível remover alternativa já usada em tentativas ou simulados."
        : error === "invalid-option"
          ? "Uma alternativa enviada não pertence ao exercício editado."
        : "Não foi possível salvar. Verifique alternativas, feedbacks e a resposta correta.";

    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
        {message}
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
