import Link from "next/link";
import { TrackLevel } from "@prisma/client";

import { AdminCheckbox, AdminSelect, AdminSubmitButton, AdminTextarea, AdminTextInput } from "@/components/admin/admin-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFormShell } from "@/components/admin/admin-form-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getLevelLabel } from "@/lib/learning/presentation";
import { saveTrackAction } from "@/server/actions/admin";
import { getAdminTracks } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

const levelOptions = Object.values(TrackLevel).map((level) => ({ value: level, label: getLevelLabel(level) }));

export default async function AdminTracksPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { tracks, editing } = await getAdminTracks(params.edit);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Trilhas"
        description="Cadastre trilhas públicas ou privadas. Conteúdos do seed são demonstrativos, fictícios e não oficiais."
      />
      <Feedback error={params.error} saved={params.saved} />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <AdminDataTable
          headers={["Trilha", "Área", "Nível", "Status", "Módulos", "Ações"]}
          rows={tracks.map((track) => [
            <div key="title">
              <p className="font-semibold text-slate-950">{track.title}</p>
              <p className="text-xs text-slate-500">{track.slug}</p>
            </div>,
            track.area,
            <Badge key="level" variant="outline">{getLevelLabel(track.level)}</Badge>,
            <div key="status" className="flex flex-wrap gap-2">
              <AdminStatusBadge active={track.isPublic} trueLabel="Pública" falseLabel="Privada" />
              <AdminStatusBadge active={track.isDemo} trueLabel="Demo" falseLabel="Real" />
            </div>,
            track._count.modules,
            <Link key="edit" className="font-semibold text-violet-700 hover:text-violet-900" href={`/admin/trilhas?edit=${track.id}`}>
              Editar
            </Link>
          ])}
        />

        <AdminFormShell
          title={editing ? "Editar trilha" : "Criar trilha"}
          description="Slugs precisam ser únicos em trilhas."
        >
          <form action={saveTrackAction} className="space-y-4">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <AdminTextInput label="Título" name="title" defaultValue={editing?.title} placeholder="Linux Básico" />
            <AdminTextInput label="Slug" name="slug" defaultValue={editing?.slug} placeholder="linux-basico" />
            <AdminTextarea label="Descrição" name="description" defaultValue={editing?.description} />
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminTextInput label="Área" name="area" defaultValue={editing?.area} />
              <AdminSelect label="Nível" name="level" defaultValue={editing?.level} options={levelOptions} />
              <AdminTextInput label="Ícone" name="coverIcon" defaultValue={editing?.coverIcon ?? "BookOpen"} />
              <AdminTextInput label="Cor" name="color" defaultValue={editing?.color ?? "violet"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminCheckbox label="Pública" name="isPublic" defaultChecked={editing?.isPublic ?? true} />
              <AdminCheckbox label="Demonstrativa" name="isDemo" defaultChecked={editing?.isDemo ?? true} />
            </div>
            <AdminSubmitButton>{editing ? "Salvar trilha" : "Criar trilha"}</AdminSubmitButton>
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
        Não foi possível salvar. Verifique campos obrigatórios e slug duplicado.
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
