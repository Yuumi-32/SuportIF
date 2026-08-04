import { Card, CardContent } from "@/components/ui/card";

/**
 * O atraso de 150ms na animação é proposital: em navegação rápida a página
 * chega antes de o esqueleto ficar visível, então não existe piscada nenhuma.
 * Só quando a espera é real ele aparece — e aparece com fade.
 */
export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <>
      <style>{`
        @keyframes ls-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .ls-card { animation: ls-fade-in .28s ease .15s both; }
        @media (prefers-reduced-motion: reduce) { .ls-card { animation: none; } }
      `}</style>
      <Card className="ls-card border-violet-100">
        <CardContent className="p-6">
          <div className="h-2 w-36 animate-pulse rounded-full bg-violet-200" />
          <p className="mt-4 text-sm text-slate-600">{label}</p>
        </CardContent>
      </Card>
    </>
  );
}
