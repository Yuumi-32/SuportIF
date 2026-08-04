"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { applyPetAction, type PetAction } from "@/lib/pet/state";
import { prisma } from "@/lib/prisma/client";
import { petCareSchema, renamePetSchema } from "@/lib/validations/pet";
import {
  buildPetOverview,
  ensurePet,
  getStudySignals,
  getTreatsUsedToday,
  toDateKey,
  type PetOverview
} from "@/server/queries/pet";

export type PetActionState = {
  status: "success" | "error";
  message: string;
  overview: PetOverview;
};

/**
 * Cuidar do pet. O servidor recalcula tudo do zero — medidor, tempo de espera e
 * petisco disponível — porque o cliente só manda qual botão foi apertado.
 */
export async function carePetAction(input: { action: PetAction }): Promise<PetActionState> {
  const user = await requireUser();
  const parsed = petCareSchema.safeParse(input);
  const now = new Date();

  const [pet, signals] = await Promise.all([ensurePet(user.id), getStudySignals(user.id, now)]);

  if (!parsed.success) {
    return { status: "error", message: "Ação inválida.", overview: buildPetOverview(pet, signals, now) };
  }

  const treatsGivenToday = getTreatsUsedToday(pet, now);
  const result = applyPetAction({
    state: {
      satiety: pet.satiety,
      energy: pet.energy,
      affection: pet.affection,
      syncedAt: pet.syncedAt,
      lastFedAt: pet.lastFedAt,
      lastPlayedAt: pet.lastPlayedAt,
      lastPettedAt: pet.lastPettedAt
    },
    action: parsed.data.action,
    now,
    signals,
    treatsGivenToday,
    petName: pet.name
  });

  const updated = await prisma.pet.update({
    where: { userId: user.id },
    data: {
      satiety: result.state.satiety,
      energy: result.state.energy,
      affection: result.state.affection,
      syncedAt: result.state.syncedAt,
      lastFedAt: result.state.lastFedAt,
      lastPlayedAt: result.state.lastPlayedAt,
      lastPettedAt: result.state.lastPettedAt,
      treatsDateKey: toDateKey(now),
      treatsUsed: treatsGivenToday + result.treatsGiven
    }
  });

  revalidatePath("/pet");

  return {
    status: "success",
    message: result.message,
    overview: buildPetOverview(updated, signals, now)
  };
}

export async function renamePetAction(input: { name: string }): Promise<PetActionState> {
  const user = await requireUser();
  const parsed = renamePetSchema.safeParse(input);
  const now = new Date();

  const [pet, signals] = await Promise.all([ensurePet(user.id), getStudySignals(user.id, now)]);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Nome inválido.",
      overview: buildPetOverview(pet, signals, now)
    };
  }

  const updated = await prisma.pet.update({
    where: { userId: user.id },
    data: { name: parsed.data.name }
  });

  revalidatePath("/pet");

  return {
    status: "success",
    message: `Agora ele se chama ${updated.name}.`,
    overview: buildPetOverview(updated, signals, now)
  };
}
