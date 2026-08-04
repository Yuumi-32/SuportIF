import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/layout/public-header";
import { getHomePathForRole } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getHomePathForRole(user.role));
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <PublicHeader />
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_440px] lg:items-center">
        <div className="hidden space-y-5 lg:block">
          <Badge variant="secondary" className="bg-white text-violet-800">
            Ambiente demonstrativo
          </Badge>
          <h1 className="max-w-xl text-5xl font-black leading-tight text-slate-950">
            Entre para continuar sua jornada de estudo.
          </h1>
          <p className="max-w-lg text-lg leading-8 text-slate-600">
            Use uma conta demonstrativa para acessar a experiência como aluno, tutor ou admin.
          </p>
        </div>
        <Card className="w-full border-violet-100 bg-white shadow-xl shadow-violet-900/10">
          <CardHeader>
            <Badge variant="secondary" className="w-fit bg-violet-50 text-violet-800">
              SuportIF
            </Badge>
            <CardTitle className="text-2xl">Entrar no ambiente</CardTitle>
            <p className="text-sm leading-6 text-slate-600">
              Use uma das contas demonstrativas abaixo para conhecer a plataforma.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <LoginForm />
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-4 text-sm leading-6 text-violet-950">
              <p className="font-semibold">Credenciais locais de demonstração</p>
              <div className="mt-2 space-y-1 text-violet-900">
                <p>admin@suportif.dev</p>
                <p>professor@suportif.dev</p>
                <p>aluno@suportif.dev</p>
              </div>
              <p className="mt-2 font-semibold">Senha: suportif123</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
