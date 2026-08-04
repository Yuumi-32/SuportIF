"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { theme } from "@/lib/appearance/palette";
import { LayoutCanvas, type CanvasBlock } from "@/components/layout/layout-canvas";
import type { BlockSize, DashboardLayoutItem } from "@/lib/appearance/layout";

export type StudentSimulationItem = {
  id: string;
  title: string;
  description: string;
  typeLabel: string;
  relationLabel: string;
  status: string;
  questionCount: number;
  attemptCount: number;
  bestScore: number | null;
  lastScore: number | null;
  lastAttemptId: string | null;
};

type StudentSimulationsProps = {
  simulations: StudentSimulationItem[];
  layout: DashboardLayoutItem[];
  freeLayout: boolean;
  startEditing: boolean;
};

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
  };
  if (status === "Revisar e refazer") return { ...base, background: "#fff7ed", color: "#9a5b1d" };
  if (status === "Consolidado") return { ...base, background: theme.brandSoft, color: theme.brandInk };
  if (status === "Recomendado") return { ...base, background: theme.fill, color: "#fff" };
  return { ...base, background: theme.chip, color: theme.ink2 };
}

const metricBoxStyle: React.CSSProperties = {
  border: `1px solid ${theme.line}`,
  borderRadius: 6,
  padding: 10,
};


/** Menos itens em bloco estreito: a largura é que define o nível de detalhe. */
function limitBySize<T>(items: T[], size: BlockSize, small: number, medium: number) {
  if (size === "P") return items.slice(0, small);
  if (size === "M") return items.slice(0, medium);
  return items;
}

export function StudentSimulations({
  simulations,
  layout,
  freeLayout,
  startEditing
}: StudentSimulationsProps) {
  const [reveal, setReveal] = useState(0);

  const totals = useMemo(() => {
    const disponiveis = simulations.length;
    const tentativas = simulations.reduce((sum, s) => sum + s.attemptCount, 0);
    const questoes = simulations.reduce((sum, s) => sum + s.questionCount, 0);
    const bests = simulations.map((s) => s.bestScore ?? 0);
    const melhor = bests.length ? Math.max(...bests) : 0;
    return { disponiveis, tentativas, questoes, melhor };
  }, [simulations]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setReveal(1);
      return;
    }
    const start = performance.now();
    const duration = 1000;
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / duration);
      setReveal(easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const stats = [
    { value: String(Math.round(totals.disponiveis * reveal)), label: "simulados disponíveis" },
    { value: String(Math.round(totals.tentativas * reveal)), label: "tentativas registradas" },
    { value: String(Math.round(totals.questoes * reveal)), label: "questões no total" },
    { value: `${Math.round(totals.melhor * reveal)}%`, label: "melhor nota" },
  ];

  const blocks: CanvasBlock[] = [
    {
      id: "sims-header",
      render: (size) => (
        <>
            <div>
              <span
                style={{
                  display: "inline-block",
                  background: theme.brandSoft,
                  color: theme.brandInk,
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 6,
                }}
              >
                Prática com resultado salvo
              </span>
              <h1 style={{ margin: "14px 0 0", fontSize: 30, fontWeight: 900, lineHeight: 1.15, color: theme.ink }}>
                Simulados
              </h1>
              {size !== "P" ? (
                <p style={{ margin: "10px 0 0", maxWidth: 560, fontSize: 16, lineHeight: 1.6, color: theme.ink2 }}>
                  Pratique no seu ritmo, acompanhe a evolução a cada tentativa e deixe que os pontos de dificuldade
                  guiem suas próximas revisões.
                </p>
              ) : null}
            </div>
        </>
      )
    },
    {
      id: "sims-stats",
      render: (size) => (
        <>
            <div
              style={{
                background: theme.card,
                border: `1px solid ${theme.line}`,
                borderRadius: 8,
                padding: 18,
                boxShadow: "0 1px 2px rgba(2,8,23,.04)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 14 }}>
                {limitBySize(stats, size, 2, 4).map((st) => (
                  <div key={st.label}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: theme.brandInk }}>{st.value}</div>
                    <div style={{ fontSize: 13, color: theme.muted }}>{st.label}</div>
                  </div>
                ))}
              </div>
            </div>
        </>
      )
    },
    {
      id: "sims-list",
      render: (size) => (
        <>
          {/* CARDS */}
          {simulations.length > 0 ? (
            <div className="sim-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              {limitBySize(simulations, size, 1, 2).map((sim) => {
                const ctaLabel = sim.attemptCount > 0 ? "Refazer" : "Começar";
                const bestLabel = sim.bestScore === null ? "—" : `${sim.bestScore}%`;
                const lastLabel =
                  sim.bestScore === null
                    ? "Você ainda não iniciou este simulado."
                    : `Último resultado: ${sim.lastScore}% · melhor ${sim.bestScore}%`;

                return (
                  <div key={sim.id} style={{ animation: "sim-rise .5s ease both" }}>
                    <div
                      className="sim-card"
                      style={{
                        background: theme.card,
                        border: `1px solid ${theme.line}`,
                        borderRadius: 12,
                        padding: 22,
                        boxShadow: "0 1px 2px rgba(2,8,23,.03)",
                        transition: "transform .25s ease, box-shadow .25s ease, border-color .25s ease",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        <span
                          style={{
                            background: theme.chip,
                            color: theme.ink2,
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: 6,
                          }}
                        >
                          {sim.typeLabel}
                        </span>
                        <span style={statusBadgeStyle(sim.status)}>{sim.status}</span>
                      </div>

                      <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, lineHeight: 1.25, color: theme.ink }}>
                        {sim.title}
                      </h3>
                      <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.55, color: theme.muted }}>
                        {sim.description}
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                        <div style={metricBoxStyle}>
                          <div style={{ fontSize: 12, color: theme.muted }}>Questões</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: theme.ink }}>{sim.questionCount}</div>
                        </div>
                        <div style={metricBoxStyle}>
                          <div style={{ fontSize: 12, color: theme.muted }}>Tentativas</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: theme.ink }}>{sim.attemptCount}</div>
                        </div>
                        <div style={metricBoxStyle}>
                          <div style={{ fontSize: 12, color: theme.muted }}>Melhor</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: theme.ink }}>{bestLabel}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          background: theme.surface,
                          borderRadius: 6,
                          padding: 12,
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: theme.ink2,
                          marginBottom: 16,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: theme.ink }}>{sim.relationLabel}</div>
                        <div>{lastLabel}</div>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <Link
                          href={`/app/simulados/${sim.id}`}
                          className="sim-cta-primary"
                          style={{
                            flex: 1,
                            height: 40,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: 0,
                            borderRadius: 6,
                            background: theme.fill,
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            textDecoration: "none",
                            transition: "background .18s",
                          }}
                        >
                          {ctaLabel}
                        </Link>
                        {sim.lastAttemptId ? (
                          <Link
                            href={`/app/simulados/${sim.id}/resultado?attemptId=${sim.lastAttemptId}`}
                            className="sim-cta-ghost"
                            style={{
                              height: 40,
                              padding: "0 16px",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `1px solid ${theme.line}`,
                              borderRadius: 6,
                              background: theme.card,
                              color: theme.ink,
                              fontSize: 14,
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "none",
                              transition: "background .18s",
                            }}
                          >
                            Resultado
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: theme.card,
                border: `1px dashed ${theme.line2}`,
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink2 }}>
                Novos simulados aparecerão aqui
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.faint }}>
                Quando houver uma prática disponível para sua jornada, ela aparecerá nesta área.
              </p>
            </div>
          )}
        </>
      )
    }
  ];

  return (
    <div className="student-sims" style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        .student-sims .sim-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(76,29,149,.10); border-color: ${theme.brandLine2}; }
        .student-sims .sim-cta-primary:hover { background: ${theme.fillDark}; }
        .student-sims .sim-cta-ghost:hover { background: ${theme.surface}; }
        @keyframes sim-rise { from { transform: translateY(14px); } to { transform: translateY(0); } }
        @media (max-width: 880px) { .student-sims .sim-head { grid-template-columns: 1fr !important; } .student-sims .sim-cards { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { .student-sims * { animation: none !important; transition: none !important; } }
      `}</style>

      <LayoutCanvas
        page="simulados"
        blocks={blocks}
        layout={layout}
        freeLayout={freeLayout}
        startEditing={startEditing}
      />
    </div>
  );
}
