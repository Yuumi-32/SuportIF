/** Meia-noite local da data — a régua usada para contar dias no painel. */
export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Distância em linguagem de gente. Passado o mês, volta para a data cheia:
 * "há 63 dias" não diz nada a quem está lendo uma auditoria.
 */
export function formatRelativeDay(date: Date, now = new Date()) {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);

  if (minutes < 60) {
    return "Agora";
  }

  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);

  if (days <= 0) {
    return "Hoje";
  }

  if (days === 1) {
    return "Ontem";
  }

  if (days <= 30) {
    return `há ${days} dias`;
  }

  return date.toLocaleDateString("pt-BR");
}
