"use server";

import { revalidatePath } from "next/cache";

import { isLayoutPage, layoutSchema, withPageLayout } from "@/lib/appearance/layout";
import { appearanceSchema, defaultAppearance, parseAppearance } from "@/lib/appearance/settings";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUser, revokeOtherSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/client";
import {
  changePasswordSchema,
  updatePreferencesSchema,
  updateProfileSchema
} from "@/lib/validations/settings";

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/** O nome aparece no cabeçalho de todas as áreas protegidas, então revalidamos o layout raiz. */
function revalidateSettings() {
  revalidatePath("/", "layout");
}

export async function updateProfileAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await requireUser();
  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name") ?? "",
    bio: formData.get("bio") ?? ""
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Não foi possível salvar o perfil."
    };
  }

  const bio = parsed.data.bio.length > 0 ? parsed.data.bio : null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name }
    }),
    prisma.profile.upsert({
      where: { userId: user.id },
      update: { bio },
      create: { userId: user.id, bio }
    })
  ]);

  revalidateSettings();
  return { status: "success", message: "Perfil atualizado." };
}

export async function updatePreferencesAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await requireUser();
  const parsed = updatePreferencesSchema.safeParse({
    preferredExplanationMode: formData.get("preferredExplanationMode") ?? ""
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Não foi possível salvar as preferências."
    };
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { preferredExplanationMode: parsed.data.preferredExplanationMode },
    create: { userId: user.id, preferredExplanationMode: parsed.data.preferredExplanationMode }
  });

  revalidateSettings();
  return { status: "success", message: "Preferências de estudo salvas." };
}

export async function updateAppearanceAction(input: unknown): Promise<SettingsActionState> {
  const user = await requireUser();
  const parsed = appearanceSchema.safeParse({ ...defaultAppearance, ...(input as object) });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Não foi possível salvar a personalização."
    };
  }

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { appearance: parsed.data },
    create: { userId: user.id, appearance: parsed.data }
  });

  revalidateSettings();
  return { status: "success", message: "Personalização aplicada." };
}

/**
 * Salva só o layout de uma página, preservando as cores e o layout das outras —
 * a chamada vem da própria página, que não conhece o resto da personalização.
 */
export async function updatePageLayoutAction(
  page: string,
  layout: unknown
): Promise<SettingsActionState> {
  const user = await requireUser();
  const parsed = layoutSchema.safeParse(layout);

  if (!parsed.success || !isLayoutPage(page)) {
    return { status: "error", message: "Layout inválido." };
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { appearance: true }
  });

  const current = parseAppearance(profile?.appearance);
  const next = { ...current, layout: withPageLayout(current.layout, page, parsed.data) };

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { appearance: next },
    create: { userId: user.id, appearance: next }
  });

  revalidateSettings();
  return { status: "success", message: "Layout salvo." };
}

export async function changePasswordAction(
  _state: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword") ?? "",
    confirmPassword: formData.get("confirmPassword") ?? ""
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Não foi possível alterar a senha."
    };
  }

  const currentMatches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);

  if (!currentMatches) {
    return { status: "error", message: "A senha atual está incorreta." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) }
  });

  // Trocar a senha desconecta os outros dispositivos, mas mantém a sessão atual.
  const revoked = await revokeOtherSessions(user.id);

  revalidateSettings();
  return {
    status: "success",
    message:
      revoked > 0
        ? `Senha alterada. ${revoked} ${revoked === 1 ? "outra sessão foi encerrada" : "outras sessões foram encerradas"}.`
        : "Senha alterada."
  };
}

export async function revokeOtherSessionsAction(): Promise<SettingsActionState> {
  const user = await requireUser();
  const revoked = await revokeOtherSessions(user.id);

  revalidateSettings();
  return {
    status: "success",
    message:
      revoked > 0
        ? `${revoked} ${revoked === 1 ? "sessão encerrada" : "sessões encerradas"}.`
        : "Nenhuma outra sessão ativa."
  };
}
