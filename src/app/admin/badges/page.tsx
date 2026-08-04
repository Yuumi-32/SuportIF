import Link from "next/link";

import { AdminCheckbox, AdminSubmitButton, AdminTextarea, AdminTextInput } from "@/components/admin/admin-fields";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFormShell } from "@/components/admin/admin-form-shell";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { saveBadgeAction } from "@/server/actions/admin";
import { getAdminBadges } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; error?: string; saved?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const { badges, editing } = await getAdminBadges(params.edit);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Badges"
        description="Gerencie conquistas demonstrativas. A concessão automática continua nas regras já existentes do fluxo do aluno."
      />
      <Feedback error={params.error} saved={params.saved} />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <AdminDataTable
          headers={["Badge", "Slug", "Regra", "Usuários", "Status", "Ações"]}
          rows={badges.map((badge) => [
            <div key="title">
              <p className="font-semibold text-slate-950">
                <span className="mr-2">{badge.icon}</span>
                {badge.title}
              </p>
              <p className="line-clamp-2 text-xs text-slate-500">{badge.description}</p>
            </div>,
            <Badge key="slug" variant="outline">{badge.slug}</Badge>,
            badge.rule,
            badge._count.users,
            <AdminStatusBadge key="demo" active={badge.isDemo} trueLabel="Demo" falseLabel="Real" />,
            <Link key="edit" className="font-semibold text-violet-700 hover:text-violet-900" href={`/admin/badges?edit=${badge.id}`}>
              Editar
            </Link>
          ])}
        />

        <AdminFormShell
          title={editing ? "Editar badge" : "Criar badge"}
          description="Slugs precisam ser únicos. Use regras curtas e compreensíveis para o MVP."
        >
          <form action={saveBadgeAction} className="space-y-4">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <AdminTextInput label="Título" name="title" defaultValue={editing?.title} />
            <AdminTextInput label="Slug" name="slug" defaultValue={editing?.slug} />
            <AdminTextarea label="Descrição" name="description" defaultValue={editing?.description} rows={3} />
            <AdminTextInput label="Ícone" name="icon" defaultValue={editing?.icon ?? "Award"} />
            <AdminTextInput label="Regra" name="rule" defaultValue={editing?.rule} />
            <AdminCheckbox label="Demonstrativo" name="isDemo" defaultChecked={editing?.isDemo ?? true} />
            <AdminSubmitButton>{editing ? "Salvar badge" : "Criar badge"}</AdminSubmitButton>
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
