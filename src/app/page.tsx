import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getHomePathForRole } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/auth/session";
import { getInstitutionSettings } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

/**
 * A raiz é a própria tela de entrada: quem já tem sessão vai direto para a área
 * do seu papel, quem não tem entra ou cria conta por aqui.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getHomePathForRole(user.role));
  }

  const institution = await getInstitutionSettings();

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Painel da marca. Some no mobile para o formulário ficar com a tela toda. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-violet-800 px-14 pb-12 pt-14 text-white lg:flex">
        <div
          aria-hidden="true"
          className="login-drift-a absolute -right-[120px] -top-[140px] h-[420px] w-[420px] rounded-full bg-white/[0.06]"
        />
        <div
          aria-hidden="true"
          className="login-drift-b absolute -bottom-[90px] -left-[70px] h-[260px] w-[260px] rounded-full bg-white/[0.05]"
        />
        <div
          aria-hidden="true"
          className="login-drift-c absolute -left-[46px] top-[34%] h-[150px] w-[150px] rounded-full bg-white/[0.05]"
        />
        <div
          aria-hidden="true"
          className="login-drift-d absolute bottom-[22%] right-[12%] h-[88px] w-[88px] rounded-full border-[1.5px] border-white/[0.16]"
        />
        <div
          aria-hidden="true"
          className="login-drift-c absolute right-[26%] top-[18%] h-11 w-11 rounded-full bg-white/[0.09]"
        />

        <div className="relative w-fit">
          <span className="text-[21px] font-black tracking-tight text-white">SuportIF</span>
          {/* Nome vindo da configuração da instituição, no painel do admin. */}
          <p className="mt-1 text-[12.5px] text-white/60">{institution.name}</p>
        </div>

        <div className="login-rise relative max-w-sm">
          <p className="text-xs font-bold uppercase tracking-[0.09em] text-white/70">
            Plataforma de estudos
          </p>
          <div className="mt-3 h-0.5 w-12 rounded-full bg-white/60" />
          <h1 className="mt-5 text-[38px] font-extrabold leading-[1.15] tracking-tight text-white">
            Seu caminho de estudos, organizado.
          </h1>
          <p className="mt-4 text-[15.5px] leading-relaxed text-white/80">
            Trilhas guiadas, simulados e revisões inteligentes — tudo num só lugar, no seu
            ritmo.
          </p>
        </div>

        <p className="relative text-[12.5px] text-white/60">
          Conteúdo demonstrativo, fictício e não oficial.
        </p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-6 py-12 sm:px-10">
        <div className="login-rise w-full max-w-[392px]">
          <span className="mb-8 inline-block text-xl font-black tracking-tight text-violet-800 lg:hidden">
            SuportIF
          </span>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
