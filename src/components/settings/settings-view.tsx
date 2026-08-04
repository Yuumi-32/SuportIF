"use client";

import { KeyRound, Palette, SlidersHorizontal, UserCircle2, UserRound } from "lucide-react";
import { useState } from "react";

import { AccountSection, type AccountSectionProps } from "@/components/settings/account-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { SecuritySection } from "@/components/settings/security-section";
import type { AppearanceSettings } from "@/lib/appearance/settings";
import type { ExplanationMode } from "@/lib/learning/explanation-modes";
import type { SettingsSection } from "@/lib/settings/sections";
import { cn } from "@/lib/utils";

const sectionNav: Array<{ id: SettingsSection; label: string; icon: typeof UserRound }> = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "personalizacao", label: "Personalização", icon: Palette },
  { id: "preferencias", label: "Estudo", icon: SlidersHorizontal },
  { id: "seguranca", label: "Segurança", icon: KeyRound },
  { id: "conta", label: "Conta", icon: UserCircle2 }
];

type SettingsViewProps = {
  initialSection: SettingsSection;
  profile: { name: string; email: string; bio: string };
  preferredExplanationMode: ExplanationMode;
  appearance: AppearanceSettings;
  activeSessionCount: number;
  account: AccountSectionProps;
};

export function SettingsView({
  initialSection,
  profile,
  preferredExplanationMode,
  appearance,
  activeSessionCount,
  account
}: SettingsViewProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Configuração</h1>
        <p className="text-sm text-slate-600">
          Ajuste seu perfil, o jeito como o conteúdo é apresentado e a segurança do seu acesso.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Seções da configuração"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {sectionNav.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors lg:w-full",
                  isActive
                    ? "bg-violet-700 text-white shadow-sm shadow-violet-900/20"
                    : "bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-900"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {section === "perfil" ? (
            <ProfileForm name={profile.name} email={profile.email} bio={profile.bio} />
          ) : null}
          {section === "personalizacao" ? <AppearanceSection initial={appearance} /> : null}
          {section === "preferencias" ? (
            <PreferencesForm preferredExplanationMode={preferredExplanationMode} />
          ) : null}
          {section === "seguranca" ? <SecuritySection activeSessionCount={activeSessionCount} /> : null}
          {section === "conta" ? <AccountSection {...account} /> : null}
        </div>
      </div>
    </div>
  );
}
