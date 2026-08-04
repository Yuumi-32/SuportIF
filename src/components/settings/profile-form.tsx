"use client";

import { useActionState, useState } from "react";

import { SettingsFeedback } from "@/components/settings/settings-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateProfileAction, type SettingsActionState } from "@/server/actions/settings";

const initialState: SettingsActionState = { status: "idle" };

const BIO_LIMIT = 280;

type ProfileFormProps = {
  name: string;
  email: string;
  bio: string;
};

export function ProfileForm({ name, email, bio }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileAction, initialState);
  const [nameValue, setNameValue] = useState(name);
  const [bioValue, setBioValue] = useState(bio);

  const initial = (nameValue.trim().charAt(0) || "?").toUpperCase();

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Perfil</CardTitle>
        <CardDescription>
          Como seu nome aparece no topo da plataforma e para quem acompanha seus estudos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 text-xl font-extrabold text-white shadow-sm">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{nameValue || "Sem nome"}</p>
              <p className="truncate text-sm text-slate-500">{email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800" htmlFor="name">
              Nome completo
            </label>
            <Input
              id="name"
              name="name"
              value={nameValue}
              onChange={(event) => setNameValue(event.target.value)}
              maxLength={80}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800" htmlFor="bio">
                Bio
              </label>
              <span className="text-xs text-slate-500">
                {bioValue.length}/{BIO_LIMIT}
              </span>
            </div>
            <textarea
              id="bio"
              name="bio"
              value={bioValue}
              onChange={(event) => setBioValue(event.target.value)}
              maxLength={BIO_LIMIT}
              rows={4}
              placeholder="Conte em poucas linhas o que você está estudando agora."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <SettingsFeedback state={state} />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
