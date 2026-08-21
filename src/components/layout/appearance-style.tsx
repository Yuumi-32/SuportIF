import { parseAppearance } from "@/lib/appearance/settings";
import { buildAppearanceCss } from "@/lib/appearance/tokens";

/**
 * Aplica a personalização salva já na renderização do servidor, para a página
 * nunca aparecer com o tema padrão antes de trocar (sem "piscada").
 *
 * Fica dentro do body de propósito: as regras precisam vir depois da folha de
 * estilo do Tailwind para poderem sobrescrever utilitários como `bg-white`.
 */
export function AppearanceStyle({
  appearance,
  institutionPreset
}: {
  appearance: unknown;
  /**
   * Cor principal da instituição. Vale só para quem ainda não personalizou
   * nada: quem já escolheu uma cor em /configuracao continua com a dele.
   */
  institutionPreset?: string;
}) {
  const settings = parseAppearance(appearance);
  const resolved = appearance || !institutionPreset ? settings : { ...settings, preset: institutionPreset };

  return (
    <style id="appearance-tokens" dangerouslySetInnerHTML={{ __html: buildAppearanceCss(resolved) }} />
  );
}
