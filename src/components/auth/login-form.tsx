"use client";

import { useActionState, useState } from "react";

import { loginAction, registerAction, type LoginActionState } from "@/server/actions/auth";

const initialState: LoginActionState = {};

type Mode = "login" | "signup";

/**
 * Força da senha em 4 níveis. Só aparece no cadastro, como um empurrãozinho —
 * a regra que realmente barra o envio continua sendo o `registerSchema`.
 */
const STRENGTH_STEPS = [
  { label: "Fraca", bar: "bg-red-500", text: "text-red-500", width: "25%" },
  { label: "Fraca", bar: "bg-red-500", text: "text-red-500", width: "25%" },
  { label: "Média", bar: "bg-amber-600", text: "text-amber-600", width: "55%" },
  { label: "Boa", bar: "bg-violet-800", text: "text-violet-800", width: "80%" },
  { label: "Forte", bar: "bg-green-600", text: "text-green-600", width: "100%" }
] as const;

function measureStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.min(score, 4);
}

const fieldClasses =
  "h-[46px] w-full rounded-[9px] border border-slate-200 bg-white px-3.5 text-[14.5px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-800 focus:ring-[3px] focus:ring-violet-800/[0.12] disabled:opacity-60";

const labelClasses = "block text-[12.5px] font-bold text-slate-600";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showRecoveryHint, setShowRecoveryHint] = useState(false);

  const [loginState, loginFormAction, isLoggingIn] = useActionState(loginAction, initialState);
  const [registerState, registerFormAction, isRegistering] = useActionState(
    registerAction,
    initialState
  );

  const isSignup = mode === "signup";
  const isPending = isSignup ? isRegistering : isLoggingIn;
  // Cada aba mostra apenas o próprio erro, então trocar de aba já limpa a tela.
  const error = isSignup ? registerState.error : loginState.error;
  const strength = STRENGTH_STEPS[measureStrength(password)];

  function switchMode(next: Mode) {
    if (next === mode) {
      return;
    }

    setMode(next);
    setPassword("");
    setShowPassword(false);
    setShowRecoveryHint(false);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Entrar ou criar conta"
        className="mb-[26px] flex gap-1 rounded-[9px] bg-slate-100 p-1"
      >
        {(
          [
            { value: "login", label: "Entrar" },
            { value: "signup", label: "Criar conta" }
          ] as const
        ).map((tab) => {
          const isActive = mode === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => switchMode(tab.value)}
              className={`h-[38px] flex-1 rounded-[7px] text-[13.5px] font-bold transition-all ${
                isActive
                  ? "bg-white text-violet-800 shadow-sm shadow-slate-900/[0.08]"
                  : "bg-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <h2 className="text-[25px] font-extrabold tracking-tight text-slate-950">
        {isSignup ? "Criar sua conta" : "Bem-vindo de volta"}
      </h2>
      <p className="mt-2 text-[14.5px] leading-relaxed text-slate-500">
        {isSignup
          ? "Leva menos de um minuto para começar a estudar."
          : "Entre para continuar de onde você parou."}
      </p>
      <div className="mb-[26px] mt-3.5 h-0.5 w-12 rounded-full bg-violet-800" />

      <form
        key={mode}
        action={isSignup ? registerFormAction : loginFormAction}
        className="space-y-4"
      >
        {isSignup ? (
          <div className="space-y-[7px]">
            <label className={labelClasses} htmlFor="name">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Como você quer ser chamado"
              required
              minLength={3}
              maxLength={80}
              disabled={isPending}
              className={fieldClasses}
            />
          </div>
        ) : null}

        <div className="space-y-[7px]">
          <label className={labelClasses} htmlFor="email">
            E-mail institucional
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[13px] top-1/2 flex -translate-y-1/2 text-slate-400"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="aluno@estudante.ifb.edu.br"
              required
              disabled={isPending}
              className={`${fieldClasses} pl-[38px]`}
            />
          </div>
        </div>

        <div className="space-y-[7px]">
          <div className="flex items-center justify-between">
            <label className={labelClasses} htmlFor="password">
              Senha
            </label>
            {isSignup ? null : (
              <button
                type="button"
                onClick={() => setShowRecoveryHint((current) => !current)}
                aria-expanded={showRecoveryHint}
                className="border-b-[1.5px] border-violet-200 pb-px text-[12.5px] font-semibold text-slate-400 transition-colors hover:border-violet-800 hover:text-violet-800"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          {!isSignup && showRecoveryHint ? (
            <p className="rounded-[9px] border border-violet-100 bg-violet-50 px-3.5 py-2.5 text-[12.5px] leading-5 text-violet-900">
              Este ambiente é demonstrativo e ainda não tem recuperação de senha. Use uma das
              contas de demonstração listadas abaixo ou peça a redefinição para quem administra
              a instalação.
            </p>
          ) : null}
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[13px] top-1/2 flex -translate-y-1/2 text-slate-400"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="••••••••"
              required
              minLength={8}
              disabled={isPending}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${fieldClasses} pl-[38px] pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[7px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-800"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
                <line
                  x1="3"
                  y1="21"
                  x2="21"
                  y2="3"
                  className={showPassword ? "opacity-100" : "opacity-0"}
                />
              </svg>
            </button>
          </div>

          {isSignup ? (
            <div className="flex items-center gap-2.5 pt-0.5">
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    password ? strength.bar : "bg-slate-300"
                  }`}
                  style={{ width: password ? strength.width : "0%" }}
                />
              </div>
              <span
                className={`min-w-[52px] text-[11.5px] font-bold ${
                  password ? strength.text : "text-slate-300"
                }`}
              >
                {password ? strength.label : "—"}
              </span>
            </div>
          ) : null}
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2.5 pt-1.5">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            disabled={isPending}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-white transition-all peer-checked:border-violet-800 peer-checked:bg-violet-800 peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-800/40 peer-focus-visible:ring-offset-2"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0 transition-opacity"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span className="text-[13.5px] text-slate-600">
            Manter conectado neste dispositivo
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="h-12 w-full rounded-[9px] bg-violet-800 text-[15px] font-bold text-white shadow-md shadow-violet-800/25 transition-all hover:bg-violet-900 disabled:cursor-wait disabled:bg-violet-700"
        >
          {isPending
            ? isSignup
              ? "Criando conta..."
              : "Entrando..."
            : isSignup
              ? "Criar minha conta"
              : "Entrar na plataforma"}
        </button>

        {error ? (
          <p
            role="alert"
            className="login-shake rounded-[9px] border border-red-200 bg-red-50 px-3.5 py-[11px] text-[13px] text-red-700"
          >
            {error}
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-center text-[13px] text-slate-400">
        {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
        <button
          type="button"
          onClick={() => switchMode(isSignup ? "login" : "signup")}
          className="border-b-[1.5px] border-violet-200 pb-px font-semibold text-violet-800 transition-colors hover:border-violet-800"
        >
          {isSignup ? "Entrar" : "Criar agora"}
        </button>
      </p>

      {isSignup ? null : (
        <div className="mt-6 rounded-[9px] border border-violet-100 bg-violet-50 p-3.5 text-[12.5px] leading-6 text-violet-950">
          <p className="font-bold">Credenciais locais de demonstração</p>
          <div className="mt-1 text-violet-900">
            <p>admin@suportif.dev · professor@suportif.dev · aluno@suportif.dev</p>
          </div>
          <p className="mt-1 font-bold">Senha: suportif123</p>
        </div>
      )}
    </div>
  );
}
