/// Seções da página de configuração. Fica fora do componente cliente porque o
/// server component também precisa da lista para ler o parâmetro `?secao=`.

export const settingsSections = [
  "perfil",
  "personalizacao",
  "preferencias",
  "seguranca",
  "conta"
] as const;

export type SettingsSection = (typeof settingsSections)[number];

export function toSettingsSection(value: string | string[] | undefined): SettingsSection {
  const candidate = Array.isArray(value) ? value[0] : value;
  return settingsSections.includes(candidate as SettingsSection)
    ? (candidate as SettingsSection)
    : "perfil";
}
