import type { UserRole } from "@prisma/client";
import Link from "next/link";

import { AppearanceStyle } from "@/components/layout/appearance-style";
import { UserMenu } from "@/components/layout/user-menu";
import { RoamingPet } from "@/components/pet/roaming-pet";
import { CalendarDrawer } from "@/components/workspace/calendar-drawer";
import { StickyNotes } from "@/components/workspace/sticky-notes";
import { getPetOverview } from "@/server/queries/pet";
import { getWorkspaceData } from "@/server/queries/workspace";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  TEACHER: "Tutor",
  STUDENT: "Aluno"
};

const navByRole: Record<UserRole, Array<{ href: string; label: string }>> = {
  STUDENT: [
    { href: "/app", label: "Início" },
    { href: "/app/trilhas", label: "Trilhas" },
    { href: "/app/simulados", label: "Simulados" },
    { href: "/app/revisoes", label: "Revisões" }
  ],
  TEACHER: [
    { href: "/tutor", label: "Tutor" },
    { href: "/tutor/turmas", label: "Turmas" }
  ],
  ADMIN: [
    { href: "/admin", label: "Admin" },
    { href: "/admin/trilhas", label: "Trilhas" },
    { href: "/admin/modulos", label: "Módulos" },
    { href: "/admin/missoes", label: "Missões" },
    { href: "/admin/exercicios", label: "Exercícios" },
    { href: "/admin/simulados", label: "Simulados" },
    { href: "/admin/badges", label: "Badges" }
  ]
};

type ProtectedShellProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profile?: { appearance?: unknown } | null;
  };
  children: React.ReactNode;
};

export async function ProtectedShell({ user, children }: ProtectedShellProps) {
  const accountContext = user.role === "STUDENT" ? "Área do aluno" : `${roleLabels[user.role]} · ${user.email}`;
  const [{ events, notes }, pet] = await Promise.all([getWorkspaceData(user.id), getPetOverview(user.id)]);

  return (
    <main className="min-h-screen bg-[hsl(var(--app-surface))]">
      <AppearanceStyle appearance={user.profile?.appearance} />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[hsl(var(--app-header)/0.95)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:min-h-16 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/" className="shrink-0 text-xl font-black tracking-normal text-white">
              SuportIF
            </Link>
            <nav
              className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
              aria-label="Navegação da área protegida"
            >
              {navByRole[user.role].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <UserMenu name={user.name} accountContext={accountContext} />
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</section>
      <CalendarDrawer events={events} />
      <StickyNotes notes={notes} />
      <RoamingPet overview={pet} />
    </main>
  );
}
