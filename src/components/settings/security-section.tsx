"use client";

import { useActionState } from "react";

import { SettingsFeedback } from "@/components/settings/settings-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  type SettingsActionState
} from "@/server/actions/settings";

const initialState: SettingsActionState = { status: "idle" };

type SecuritySectionProps = {
  activeSessionCount: number;
};

export function SecuritySection({ activeSessionCount }: SecuritySectionProps) {
  const [passwordState, passwordAction, isChangingPassword] = useActionState(
    changePasswordAction,
    initialState
  );
  const [sessionsState, sessionsAction, isRevoking] = useActionState(
    revokeOtherSessionsAction,
    initialState
  );

  const otherSessions = Math.max(0, activeSessionCount - 1);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Alterar senha</CardTitle>
          <CardDescription>
            Ao trocar a senha, os outros dispositivos conectados são desconectados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-800" htmlFor="currentPassword">
                Senha atual
              </label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800" htmlFor="newPassword">
                  Nova senha
                </label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-slate-500">Pelo menos 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800" htmlFor="confirmPassword">
                  Confirmar nova senha
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <SettingsFeedback state={passwordState} />

            <div className="flex justify-end">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Alterando..." : "Alterar senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Sessões ativas</CardTitle>
          <CardDescription>
            Cada navegador em que você entrou conta como uma sessão. Encerre as outras se usou um
            computador compartilhado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sessionsAction} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <strong className="font-bold text-slate-900">{activeSessionCount}</strong>{" "}
              {activeSessionCount === 1 ? "sessão ativa" : "sessões ativas"}
              {otherSessions > 0
                ? ` — ${otherSessions} além deste dispositivo.`
                : " — apenas este dispositivo."}
            </div>

            <SettingsFeedback state={sessionsState} />

            <div className="flex justify-end">
              <Button type="submit" variant="outline" disabled={isRevoking || otherSessions === 0}>
                {isRevoking ? "Encerrando..." : "Encerrar outras sessões"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
