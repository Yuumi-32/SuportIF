import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { getHomePathForRole } from "@/lib/auth/redirects";

const DEFAULT_COOKIE_NAME = "suportif_session";

function getCookieName() {
  return process.env.AUTH_COOKIE_NAME ?? DEFAULT_COOKIE_NAME;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionDurationMs() {
  const days = Number(process.env.AUTH_SESSION_DAYS ?? "7");
  return days * 24 * 60 * 60 * 1000;
}

/** Sem "manter conectado" a sessão dura um dia e morre ao fechar o navegador. */
const SHORT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export type CreateSessionOptions = {
  /**
   * Marcado no login ("Manter conectado neste dispositivo"): grava o cookie com
   * data de expiração. Sem ele o cookie vira de sessão e some quando o
   * navegador fecha.
   */
  remember?: boolean;
};

export async function createSession(userId: string, options: CreateSessionOptions = {}) {
  const remember = options.remember ?? true;
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + (remember ? getSessionDurationMs() : SHORT_SESSION_DURATION_MS)
  );

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(getCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { expires: expiresAt } : {})
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashToken(token)
      }
    });
  }

  cookieStore.delete(getCookieName());
}

/**
 * Encerra todas as sessões do usuário, menos a que está em uso agora.
 * Retorna quantos dispositivos foram desconectados.
 */
export async function revokeOtherSessions(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;

  const result = await prisma.session.deleteMany({
    where: {
      userId,
      ...(token ? { NOT: { tokenHash: hashToken(token) } } : {})
    }
  });

  return result.count;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token)
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) {
      await prisma.session.delete({
        where: {
          id: session.id
        }
      });
    }

    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect(`${getHomePathForRole(user.role)}?error=forbidden`);
  }

  return user;
}
