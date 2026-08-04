"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type ExplanationTabsProps = {
  sections: Array<{
    id: string;
    label: string;
    content: React.ReactNode;
  }>;
  /** Aba aberta ao entrar na missão. Vem da preferência salva em Configuração. */
  initialSectionId?: string;
};

export function ExplanationTabs({ sections, initialSectionId }: ExplanationTabsProps) {
  const defaultId = sections.some((section) => section.id === initialSectionId)
    ? initialSectionId
    : sections[0]?.id;
  const [activeId, setActiveId] = useState(defaultId);
  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveId(section.id)}
            className={cn(
              "rounded-md border px-3 py-2 text-sm font-semibold transition-colors",
              activeId === section.id
                ? "border-violet-700 bg-violet-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm shadow-slate-950/[0.03]">
        {activeSection?.content}
      </div>
    </div>
  );
}
