"use client";

import { Layers, LayoutGrid, Moon, Paintbrush, RotateCcw, Sun, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { SettingsFeedback } from "@/components/settings/settings-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  appearancePresets,
  defaultAppearance,
  type AppearanceLevel,
  type AppearanceSettings
} from "@/lib/appearance/settings";
import { buildAppearanceCss, hslToHex, resolveAppearance } from "@/lib/appearance/tokens";
import { cn } from "@/lib/utils";
import { updateAppearanceAction, type SettingsActionState } from "@/server/actions/settings";

const levels: Array<{ id: AppearanceLevel; label: string; hint: string; icon: typeof Wand2 }> = [
  {
    id: "SIMPLE",
    label: "Simples",
    hint: "Combinações prontas. Três escolhas e pronto.",
    icon: Wand2
  },
  {
    id: "INTERMEDIATE",
    label: "Intermediário",
    hint: "Cor livre, fundo, fonte e cabeçalho.",
    icon: Paintbrush
  },
  {
    id: "ADVANCED",
    label: "Avançado",
    hint: "Valor exato de cada token, animações e JSON do tema.",
    icon: Layers
  }
];

const textSizeOptions = [
  { value: "COMPACT", label: "Compacto" },
  { value: "DEFAULT", label: "Padrão" },
  { value: "LARGE", label: "Grande" }
] as const;

const cornerOptions = [
  { value: "SHARP", label: "Retos" },
  { value: "DEFAULT", label: "Padrão" },
  { value: "ROUND", label: "Arredondados" }
] as const;

const surfaceOptions = [
  { value: "CINZA", label: "Cinza" },
  { value: "BRANCO", label: "Liso" },
  { value: "TOM", label: "Tom da cor" },
  { value: "AREIA", label: "Areia" }
] as const;

const fontOptions = [
  { value: "SYSTEM", label: "Sistema" },
  { value: "SERIF", label: "Serifada" },
  { value: "MONO", label: "Monoespaçada" }
] as const;

const headerOptions = [
  { value: "LIGHT", label: "Claro" },
  { value: "MEDIUM", label: "Médio" },
  { value: "DARK", label: "Escuro" }
] as const;

type FieldProps = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
            value === option.value
              ? "border-violet-700 bg-violet-700 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  hint,
  value,
  fallback,
  onChange
}: {
  label: string;
  hint?: string;
  value: string | null;
  fallback: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={value ?? fallback}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
          aria-label={label}
        />
        <code className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
          {value ?? `${fallback} (automático)`}
        </code>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            usar automático
          </button>
        ) : null}
      </div>
    </Field>
  );
}

function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-700"
          aria-label={label}
        />
        <span className="w-16 shrink-0 text-right text-sm font-semibold text-slate-800">
          {value}
          {suffix}
        </span>
      </div>
    </Field>
  );
}

export function AppearanceSection({ initial }: { initial: AppearanceSettings }) {
  const [settings, setSettings] = useState<AppearanceSettings>(initial);
  const [saved, setSaved] = useState<AppearanceSettings>(initial);
  const [state, setState] = useState<SettingsActionState>({ status: "idle" });
  const [jsonDraft, setJsonDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const router = useRouter();

  // Pré-visualização: as regras entram no fim do body, depois do <style> que o
  // servidor renderiza, então elas vencem enquanto a página estiver aberta.
  useEffect(() => {
    const element = document.createElement("style");
    element.id = "appearance-preview";
    document.body.appendChild(element);
    styleRef.current = element;

    return () => {
      element.remove();
      styleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (styleRef.current) {
      styleRef.current.textContent = buildAppearanceCss(settings);
    }
  }, [settings]);

  const resolved = resolveAppearance(settings);
  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const showIntermediate = settings.level === "INTERMEDIATE" || settings.level === "ADVANCED";
  const showAdvanced = settings.level === "ADVANCED";

  function update(patch: Partial<AppearanceSettings>) {
    setState({ status: "idle" });
    setSettings((current) => ({ ...current, ...patch }));
  }

  function save() {
    // Congela o que está sendo enviado: o usuário pode continuar mexendo enquanto salva.
    const snapshot = settings;

    startTransition(async () => {
      const result = await updateAppearanceAction(snapshot);
      setState(result);
      if (result.status === "success") {
        setSaved(snapshot);
      }
    });
  }

  function reset() {
    update({ ...defaultAppearance, level: settings.level });
  }

  /** Salva antes de sair: o modo edição depende da preferência já estar no banco. */
  function openEditMode() {
    const snapshot: AppearanceSettings = { ...settings, freeLayout: true };

    startTransition(async () => {
      const result = await updateAppearanceAction(snapshot);
      setState(result);

      if (result.status === "success") {
        setSettings(snapshot);
        setSaved(snapshot);
        router.push("/app?editar=1");
      }
    });
  }

  function importJson() {
    try {
      const parsed = JSON.parse(jsonDraft) as Partial<AppearanceSettings>;
      setSettings({ ...defaultAppearance, ...parsed });
      setState({ status: "success", message: "Tema carregado. Confira e salve." });
      setJsonDraft("");
    } catch {
      setState({ status: "error", message: "JSON inválido." });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Nível de personalização</CardTitle>
          <CardDescription>
            Quanto mais alto o nível, mais detalhes ficam sob seu controle. Os ajustes dos outros
            níveis continuam salvos — só não são aplicados enquanto você não voltar para eles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {levels.map((item) => {
              const Icon = item.icon;
              const isActive = settings.level === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => update({ level: item.id })}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-lg border p-4 text-left transition-colors",
                    isActive
                      ? "border-violet-700 bg-violet-50"
                      : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Icon className="h-4 w-4 text-violet-700" /> {item.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{item.hint}</span>
                </button>
              );
            })}

            {/* Modo à parte: não substitui o nível de cor, funciona junto com ele. */}
            <button
              type="button"
              onClick={() => update({ freeLayout: !settings.freeLayout })}
              aria-pressed={settings.freeLayout}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                settings.freeLayout
                  ? "border-violet-700 bg-violet-50"
                  : "border-dashed border-slate-300 bg-white hover:border-violet-200 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <LayoutGrid className="h-4 w-4 text-violet-700" /> Interface livre
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    settings.freeLayout ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-500"
                  )}
                >
                  {settings.freeLayout ? "Ativo" : "Inativo"}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">
                Mover, redimensionar e ocultar os blocos com cliques diretos — em Início, Trilhas,
                Simulados e Revisões.
              </span>
            </button>
          </div>

          {settings.freeLayout ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
              <p className="text-sm leading-6 text-slate-700">
                No modo edição todos os blocos ficam editáveis ao mesmo tempo — você mexe só nos que
                quiser. Cada página guarda o próprio layout — nas outras, use o botão “Editar
                layout” que aparece no topo. Abrir daqui já salva a personalização.
              </p>
              <Button type="button" onClick={openEditMode} disabled={isPending} className="shrink-0">
                <LayoutGrid className="h-4 w-4" />
                {isPending ? "Abrindo..." : "Entrar no modo edição"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Básico</CardTitle>
          <CardDescription>Disponível em todos os níveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Tema">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "LIGHT", label: "Claro", icon: Sun },
                  { value: "DARK", label: "Escuro", icon: Moon }
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update({ theme: option.value })}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                      settings.theme === option.value
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50"
                    )}
                  >
                    <Icon className="h-4 w-4" /> {option.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field
            label="Paleta"
            hint={
              showIntermediate && settings.accent
                ? "Uma cor personalizada está ativa e substitui a paleta escolhida."
                : undefined
            }
          >
            <div className="flex flex-wrap gap-2">
              {appearancePresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => update({ preset: preset.id, accent: null })}
                  title={preset.label}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
                    settings.preset === preset.id && !settings.accent
                      ? "border-violet-700 bg-violet-50 text-violet-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-200"
                  )}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ background: preset.accent }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Tamanho do texto" hint="Escala toda a interface, não só as letras.">
            <OptionRow
              options={textSizeOptions}
              value={settings.textSize}
              onChange={(value) => update({ textSize: value })}
            />
          </Field>

          <Field label="Cantos">
            <OptionRow
              options={cornerOptions}
              value={settings.corners}
              onChange={(value) => update({ corners: value })}
            />
          </Field>
        </CardContent>
      </Card>

      {showIntermediate ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Intermediário</CardTitle>
            <CardDescription>Escolhas guiadas sobre cor, superfície e tipografia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ColorField
              label="Cor de destaque"
              hint="Gera a paleta inteira a partir dessa cor, mantendo o contraste."
              value={settings.accent}
              fallback={resolved.accentHex}
              onChange={(value) => update({ accent: value })}
            />

            <Field label="Fundo">
              <OptionRow
                options={surfaceOptions}
                value={settings.surface}
                onChange={(value) => update({ surface: value })}
              />
            </Field>

            <Field label="Fonte">
              <OptionRow
                options={fontOptions}
                value={settings.font}
                onChange={(value) => update({ font: value })}
              />
            </Field>

            <Field label="Cabeçalho" hint="Quão escura fica a barra do topo.">
              <OptionRow
                options={headerOptions}
                value={settings.headerShade}
                onChange={(value) => update({ headerShade: value })}
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {showAdvanced ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Avançado</CardTitle>
            <CardDescription>
              Valores exatos por token. Estes campos substituem as escolhas dos níveis anteriores.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <RangeField
              label="Intensidade da cor"
              hint="Satura ou lava a paleta gerada."
              value={settings.accentStrength}
              min={40}
              max={160}
              suffix="%"
              onChange={(value) => update({ accentStrength: value })}
            />
            <RangeField
              label="Raio dos cantos"
              value={settings.radiusPx}
              min={0}
              max={24}
              suffix="px"
              onChange={(value) => update({ radiusPx: value })}
            />
            <RangeField
              label="Tamanho da fonte"
              value={settings.fontSizePx}
              min={13}
              max={20}
              suffix="px"
              onChange={(value) => update({ fontSizePx: value })}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <ColorField
                label="Cor do cabeçalho"
                value={settings.headerColor}
                fallback={hslToHex(resolved.headerHsl)}
                onChange={(value) => update({ headerColor: value })}
              />
              <ColorField
                label="Cor do fundo"
                value={settings.surfaceColor}
                fallback={resolved.surfaceHex}
                onChange={(value) => update({ surfaceColor: value })}
              />
              <ColorField
                label="Cor dos cartões"
                value={settings.cardColor}
                fallback={resolved.cardHex}
                onChange={(value) => update({ cardColor: value })}
              />
              <ColorField
                label="Cor do texto"
                hint="Deixe em automático para seguir o contraste do fundo."
                value={settings.textColor}
                fallback={hslToHex(resolved.textHsl)}
                onChange={(value) => update({ textColor: value })}
              />
            </div>

            <Field label="Animações" hint="Desligue para reduzir transições e movimento.">
              <OptionRow
                options={[
                  { value: "on", label: "Ativadas" },
                  { value: "off", label: "Reduzidas" }
                ]}
                value={settings.animations ? "on" : "off"}
                onChange={(value) => update({ animations: value === "on" })}
              />
            </Field>

            <Field label="Tema em JSON" hint="Copie para guardar ou cole um tema pronto.">
              <textarea
                value={jsonDraft || JSON.stringify(settings, null, 2)}
                onChange={(event) => setJsonDraft(event.target.value)}
                rows={8}
                spellCheck={false}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={importJson} disabled={!jsonDraft}>
                  Aplicar JSON
                </Button>
                <Button type="button" variant="ghost" onClick={() => setJsonDraft("")}>
                  Descartar edição do JSON
                </Button>
              </div>
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Amostra</CardTitle>
          <CardDescription>
            A plataforma inteira já está mostrando o resultado — salve para manter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-[hsl(var(--app-header))] px-4 py-3 text-sm font-black text-white">
              SuportIF
            </div>
            <div className="space-y-3 bg-[hsl(var(--app-surface))] p-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Missão de exemplo</p>
                <p className="mt-1 text-sm text-slate-600">
                  Assim ficam os cartões, textos e botões com a sua configuração.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm">
                    Continuar
                  </Button>
                  <Button type="button" size="sm" variant="outline">
                    Depois
                  </Button>
                  <span className="inline-flex items-center rounded-md bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-800">
                    +25 XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          <SettingsFeedback state={state} />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Restaurar padrão
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettings(saved)}
              disabled={!isDirty || isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={!isDirty || isPending}>
              {isPending ? "Salvando..." : "Salvar personalização"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
