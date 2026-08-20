import { permanentRedirect } from "next/navigation";

/**
 * A tela de entrada passou a ser a raiz. Esta rota fica só para não quebrar
 * links antigos apontando para /login.
 */
export default function LoginRedirectPage() {
  permanentRedirect("/");
}
