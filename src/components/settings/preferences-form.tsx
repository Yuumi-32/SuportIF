"use client";

import { useActionState, useState } from "react";

import { SettingsFeedback } from "@/components/settings/settings-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { explanationModes, type ExplanationMode } from "@/lib/learning/explanation-modes";
import { cn } from "@/lib/utils";
import { updatePreferencesAction, type SettingsActionState } from "@/server/actions/settings";

const initialState: SettingsActionState = { status: "idle" };

type PreferencesFormProps = {
  preferredExplanationMode: ExplanationMode;
};

export function PreferencesForm({ preferredExplanationMode }: PreferencesFormProps) {
  const [state, formAction, isPending] = useActionState(updatePreferencesAction, initialState);
  const [mode, setMode] = useState<ExplanationMode>(preferredExplanationMode);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Preferências de estudo</CardTitle>
        <CardDescription>
          Escolha por qual explicação as missões devem abrir. As outras continuam disponíveis nas abas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="sr-only">Modo de explicação preferido</legend>
            {explanationModes.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  mode === option.value
                    ? "border-violet-700 bg-violet-50"
                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name="preferredExplanationMode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="mt-1 h-4 w-4 accent-violet-700"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">{option.label}</span>
                  <span className="block text-sm leading-6 text-slate-600">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <SettingsFeedback state={state} />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar preferências"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
