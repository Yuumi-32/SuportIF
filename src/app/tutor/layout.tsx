import { ProtectedShell } from "@/components/layout/protected-shell";
import { requireRole } from "@/lib/auth/session";

/**
 * A casca (cabeçalho, agenda, notas e o <style> do tema) vive no layout para
 * sobreviver à navegação: trocar de página troca só o conteúdo, sem repintar a
 * tela — é o que evitava o "flash" branco enquanto o loading aparecia.
 */
export default async function TutorAreaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["TEACHER"]);

  return <ProtectedShell user={user}>{children}</ProtectedShell>;
}
