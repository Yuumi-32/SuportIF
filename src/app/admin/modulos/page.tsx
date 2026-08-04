import Link from "next/link";

import { AdminCheckbox, AdminSelect, AdminSubmitButton, AdminTextarea, AdminTextInput } from "@/components/admin/admin-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFormShell } from "@/components/admin/admin-form-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { saveModuleAction } from "@/server/actions/admin";
import { getAdminModules } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { modules, tracks, editing } = await getAdminModules(params.edit);
  const trackOptions = tracks.map((track) => ({ value: track.id, label: track.title }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Módulos"
        description="Organize módulos dentro das trilhas demonstrativas. O slug é único dentro de cada trilha."
      />
      <Feedback error={params.error} saved={params.saved} />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <AdminDataTable
          headers={["Módulo", "Trilha", "Ordem", "Status", "Missões", "Ações"]}
          rows={modules.map((item) => [
            <div key="title">
              <p className="font-semibold text-slate-950">{item.title}</p>
              <p className="text-xs text-slate-500">{item.slug}</p>
            </div>,
            <Badge key="track" variant="outline">{item.track.title}</Badge>,
            item.order,
            <AdminStatusBadge key="demo" active={item.isDemo} trueLabel="Demo" falseLabel="Real" />,
            item._count.missions,
            <Link key="edit" className="font-semibold text-violet-700 hover:text-violet-900" href={`/admin/modulos?edit=${item.id}`}>
              Editar
            </Link>
          ])}
        />

        <AdminFormShell
          title={editing ? "Editar módulo" : "Criar módulo"}
          description="Escolha a trilha, defina ordem e descrição objetiva."
        >
          <form action={saveModuleAction} className="space-y-4">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <AdminSelect label="Trilha" name="trackId" defaultValue={editing?.trackId} options={trackOptions} />
            <AdminTextInput label="Título" name="title" defaultValue={editing?.title} />
            <AdminTextInput label="Slug" name="slug" defaultValue={editing?.slug} />
            <AdminTextarea label="Descrição" name="description" defaultValue={editing?.description} />
            <AdminTextInput label="Ordem" name="order" type="number" defaultValue={editing?.order ?? 1} />
            <AdminCheckbox label="Demonstrativo" name="isDemo" defaultChecked={editing?.isDemo ?? true} />
            <AdminSubmitButton>{editing ? "Salvar módulo" : "Criar módulo"}</AdminSubmitButton>
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
        Não foi possível salvar. Verifique campos obrigatórios e slug duplicado dentro da trilha.
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
