import Link from "next/link";

import { AdminDashboardCard } from "@/components/admin/admin-dashboard-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSectionCard } from "@/components/admin/admin-section-card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getAdminDashboard } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/admin/trilhas", title: "Trilhas", description: "Gerencie áreas, nível, visibilidade e módulos." },
  { href: "/admin/modulos", title: "Módulos", description: "Organize módulos dentro das trilhas." },
  { href: "/admin/missoes", title: "Missões", description: "Edite conteúdo em camadas e XP." },
  { href: "/admin/exercicios", title: "Exercícios", description: "Cadastre questões e alternativas." },
  { href: "/admin/simulados", title: "Simulados", description: "Monte simulados com exercícios reais." },
  { href: "/admin/badges", title: "Badges", description: "Configure conquistas demonstrativas." }
];

export default async function AdminPage() {
  await requireRole(["ADMIN"]);
  const dashboard = await getAdminDashboard();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin · acesso restrito"
        title="Centro de conteúdo SuportIF"
        description="Gerencie o conteúdo demonstrativo do MVP com dados persistidos no PostgreSQL. O conteúdo atual é fictício, demonstrativo e não oficial."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminDashboardCard title="Usuários" value={dashboard.users} description="Contas reais cadastradas" />
        <AdminDashboardCard title="Trilhas" value={dashboard.tracks} description={`${dashboard.demoTracks} demo`} />
        <AdminDashboardCard title="Módulos" value={dashboard.modules} description="Organização por trilha" />
        <AdminDashboardCard title="Missões" value={dashboard.missions} description={`${dashboard.demoMissions} demo`} />
        <AdminDashboardCard title="Exercícios" value={dashboard.exercises} description="Questões persistidas" />
        <AdminDashboardCard title="Simulados" value={dashboard.simulations} description="Avaliações montadas" />
        <AdminDashboardCard title="Badges" value={dashboard.badges} description="Conquistas disponíveis" />
        <AdminDashboardCard title="Licença" value="AGPL" description="Projeto aberto e copyleft" />
      </div>

      <AdminSectionCard
        title="Gerenciar conteúdo"
        description="Cada área abaixo consulta e grava dados reais. Não há importação automática nem conteúdo oficial nesta fase."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-violet-200 hover:bg-violet-50"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold text-slate-950">{item.title}</h2>
                <Badge variant="outline">CRUD</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </AdminSectionCard>
    </div>
  );
}
