import { ProtectedShell } from "@/components/layout/protected-shell";
import { requireUser } from "@/lib/auth/session";

/**
 * Mesma casca das outras áreas protegidas: cabeçalho, agenda, notas e o <style>
 * do tema ficam no layout para sobreviver à navegação.
 */
export default async function NotasLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return <ProtectedShell user={user}>{children}</ProtectedShell>;
}
