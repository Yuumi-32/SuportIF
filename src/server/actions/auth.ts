"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth/session";
import { getHomePathForRole } from "@/lib/auth/redirects";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma/client";
import { loginSchema } from "@/lib/validations/auth";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos."
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email
    }
  });

  if (!user) {
    return {
      error: "E-mail ou senha inválidos."
    };
  }

  const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return {
      error: "E-mail ou senha inválidos."
    };
  }

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      lastLoginAt: new Date()
    }
  });

  await createSession(user.id);
  redirect(getHomePathForRole(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
