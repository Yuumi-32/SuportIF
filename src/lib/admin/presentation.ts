import type { UserRole } from "@prisma/client";

/// Resposta das ações do painel. O texto vira o aviso que aparece no topo da
/// página, então já chega pronto para leitura.
export type AdminActionResult = { ok: boolean; message: string };

/**
 * Nome do professor com o prefixo — sem duplicar quando ele já está cadastrado
 * como "Prof. Fulano", que é o caso do seed.
 */
export function formatTeacherName(name: string) {
  return /^prof\.?\s/i.test(name) ? name : `Prof. ${name}`;
}

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

/// Frases da auditoria. A chave é o `action` gravado no ActivityLog e o valor
/// completa "<Autor> ...", por isso todas começam por verbo.
const actionPhrases: Record<string, string> = {
  ADMIN_TRACK_CREATED: "criou uma trilha",
  ADMIN_TRACK_UPDATED: "editou uma trilha",
  ADMIN_MODULE_CREATED: "criou um módulo",
  ADMIN_MODULE_UPDATED: "editou um módulo",
  ADMIN_MODULE_APPROVED: "aprovou e publicou um módulo",
  ADMIN_MODULE_REJECTED: "rejeitou um módulo",
  ADMIN_MISSION_CREATED: "criou uma missão",
  ADMIN_MISSION_UPDATED: "editou uma missão",
  ADMIN_EXERCISE_CREATED: "criou um exercício",
  ADMIN_EXERCISE_UPDATED: "editou um exercício",
  ADMIN_SIMULATION_CREATED: "montou um simulado",
  ADMIN_SIMULATION_UPDATED: "editou um simulado",
  ADMIN_BADGE_CREATED: "criou uma badge",
  ADMIN_BADGE_UPDATED: "editou uma badge",
  ADMIN_USER_SUSPENDED: "suspendeu uma conta",
  ADMIN_USER_REACTIVATED: "reativou uma conta",
  ADMIN_CLASS_CREATED: "criou uma turma",
  ADMIN_SETTINGS_UPDATED: "alterou as configurações da instituição",
  TEACHER_NOTE_CREATED: "registrou uma observação sobre um aluno",
  TRACK_STARTED: "começou uma trilha",
  MISSION_OPENED: "abriu uma missão",
  EXERCISE_CORRECT: "acertou um exercício",
  EXERCISE_WRONG: "errou um exercício",
  REVIEW_COMPLETED: "concluiu uma revisão",
  SIMULATION_SUBMITTED: "entregou um simulado",
  SEED_ADMIN_CREATED: "entrou na carga inicial de dados",
  SEED_CLASS_READY: "recebeu a turma demonstrativa na carga inicial",
  SEED_SIMULATION_ATTEMPT: "teve um simulado gerado na carga inicial",
  SEED_EXAM_STRUCTURE: "recebeu a estrutura de prova na carga inicial"
};

/** Traduz o registro cru do ActivityLog para a linha da aba Auditoria. */
export function formatAdminAction(action: string, entityType: string) {
  const known = actionPhrases[action];

  if (known) {
    return known;
  }

  // Registro de seed ou ação nova ainda sem frase: cai para algo legível em vez
  // de mostrar SCREAMING_SNAKE na tela.
  const readable = action.toLowerCase().replace(/_/g, " ");
  return `${readable} (${entityType.toLowerCase()})`;
}

/// Grupo da etiqueta colorida na auditoria. Segue a entidade tocada, que é o
/// que o admin usa para varrer a lista com o olho.
export type AdminLogTone = "content" | "class" | "account" | "config" | "platform";

const entityTones: Record<string, AdminLogTone> = {
  TRACK: "content",
  MODULE: "content",
  MISSION: "content",
  EXERCISE: "content",
  SIMULATION: "platform",
  BADGE: "platform",
  REVIEW: "platform",
  CLASS_GROUP: "class",
  USER: "account",
  SETTINGS: "config",
  EXAM: "content"
};

const toneLabels: Record<AdminLogTone, string> = {
  content: "Conteúdo",
  class: "Turmas",
  account: "Contas",
  config: "Config",
  platform: "Plataforma"
};

export function getLogTone(entityType: string): AdminLogTone {
  return entityTones[entityType] ?? "platform";
}

export function getLogToneLabel(entityType: string) {
  return toneLabels[getLogTone(entityType)];
}

/**
 * O que cada papel pode fazer hoje.
 *
 * É um espelho dos `requireRole` das rotas (src/app/**), não uma configuração:
 * os papéis são fixos nesta fase, então a tabela documenta a regra em vez de
 * fingir que a edita.
 */
export const rolePermissions: Array<{
  id: string;
  label: string;
  description: string;
  roles: Record<UserRole, boolean>;
}> = [
  {
    id: "study",
    label: "Estudar trilhas e missões",
    description: "Abrir o conteúdo publicado e responder exercícios",
    roles: { STUDENT: true, TEACHER: false, ADMIN: false }
  },
  {
    id: "simulations",
    label: "Responder simulados",
    description: "Fazer a prova e ver o próprio resultado",
    roles: { STUDENT: true, TEACHER: false, ADMIN: false }
  },
  {
    id: "reviews",
    label: "Fila de revisões",
    description: "Revisão espaçada e agenda pessoal",
    roles: { STUDENT: true, TEACHER: false, ADMIN: false }
  },
  {
    id: "class-progress",
    label: "Acompanhar turmas e alunos",
    description: "Painel do tutor, sinais de risco e progresso",
    roles: { STUDENT: false, TEACHER: true, ADMIN: false }
  },
  {
    id: "notes",
    label: "Registrar observações",
    description: "Anotações do professor sobre cada aluno",
    roles: { STUDENT: false, TEACHER: true, ADMIN: false }
  },
  {
    id: "content",
    label: "Criar e editar conteúdo",
    description: "Trilhas, módulos, missões, exercícios e simulados",
    roles: { STUDENT: false, TEACHER: false, ADMIN: true }
  },
  {
    id: "approve",
    label: "Aprovar conteúdo",
    description: "Publicar um módulo para as turmas",
    roles: { STUDENT: false, TEACHER: false, ADMIN: true }
  },
  {
    id: "accounts",
    label: "Gerenciar contas e turmas",
    description: "Suspender, reativar e criar turmas",
    roles: { STUDENT: false, TEACHER: false, ADMIN: true }
  }
];
