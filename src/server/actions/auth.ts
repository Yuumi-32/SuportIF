"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth/session";
import { getHomePathForRole } from "@/lib/auth/redirects";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma/client";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export type LoginActionState = {
  error?: string;
};

export type RegisterActionState = {
  error?: string;
};

/** O checkbox só chega no FormData quando está marcado. */
function readRemember(formData: FormData) {
  return formData.get("remember") === "on";
}

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

  await createSession(user.id, { remember: readRemember(formData) });
  redirect(getHomePathForRole(user.role));
}

/**
 * Cadastro pela aba "Criar conta" da tela de entrada. Toda conta criada por aqui entra
 * como STUDENT — tutor e admin continuam saindo do seed ou da área de admin.
 */
export async function registerAction(
  _previousState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos."
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user;

  try {
    user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "STUDENT",
        lastLoginAt: new Date(),
        profile: {
          create: {}
        }
      }
    });
  } catch (error) {
    // P2002 = violação de índice único, ou seja, o e-mail já está cadastrado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error: "Já existe uma conta com este e-mail. Tente entrar."
      };
    }

    throw error;
  }

  await createSession(user.id, { remember: readRemember(formData) });
  redirect(getHomePathForRole(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
