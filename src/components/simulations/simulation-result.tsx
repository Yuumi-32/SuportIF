"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { theme } from "@/lib/appearance/palette";

export type ResultSkillItem = { label: string; detail: string };
export type ResultRecommendation = { title?: string; text: string };
export type ResultReviewItem = {
  id: string;
  prompt: string;
  isCorrect: boolean;
  context: string;
  your: string;
  correct: string | null;
  feedback: string;
  missionId: string;
  missionTitle: string;
};
export type ResultEvolutionItem = { dateLabel: string; score: number; delta: number | null };

type SimulationResultProps = {
  simulationId: string;
  title: string;
  finishedLabel: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  strongSkills: ResultSkillItem[];
  weakSkills: ResultSkillItem[];
  recommendations: ResultRecommendation[];
  review: ResultReviewItem[];
  evolution: ResultEvolutionItem[];
  evolutionSummary: string;
};

type Filter = "all" | "wrong" | "correct";

const RING_RADIUS = 74;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

type ConfettiPiece = { left: number; w: number; h: number; color: string; dur: number; delay: number };

export function SimulationResult(props: SimulationResultProps) {
  const {
    simulationId,
    title,
    finishedLabel,
    score,
    correctCount,
    wrongCount,
    totalQuestions,
    strongSkills,
    weakSkills,
    recommendations,
    review,
    evolution,
    evolutionSummary,
  } = props;

  const [reveal, setReveal] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

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
    const duration = 1100;
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / duration);
      setReveal(easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    });

    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (score >= 80) {
      const colors = [theme.fill, theme.fillDark, theme.brandLine2, "#f59e0b", "#fcd9b6"];
      const pieces: ConfettiPiece[] = Array.from({ length: 40 }, (_, i) => ({
        left: Math.round(Math.random() * 100),
        w: 6 + Math.round(Math.random() * 6),
        h: 8 + Math.round(Math.random() * 8),
        color: colors[i % colors.length],
        dur: 1.8 + Math.random() * 1.4,
        delay: Math.random() * 0.6,
      }));
      setConfetti(pieces);
      timeout = setTimeout(() => setConfetti([]), 3500);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
  }, [score]);

  const displayScore = Math.round(score * reveal);
  const ringOffset = RING_CIRC * (1 - (score / 100) * reveal);
  const passed = score >= 60;
  const celebrateHead =
    score >= 80
      ? "Excelente! Você mandou muito bem."
      : score >= 60
        ? "Bom resultado — continue reforçando."
        : "Continue praticando, você vai chegar lá.";
  const readingTip = passed
    ? "Bom desempenho. Reforce os pontos fracos para consolidar antes de avançar."
    : "Use os pontos fracos para escolher revisões antes de refazer o simulado.";

  const filtered = review.filter((w) => (filter === "all" ? true : filter === "wrong" ? !w.isCorrect : w.isCorrect));
  const filterTabs: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "Todas" },
    { key: "wrong", label: "Erradas" },
    { key: "correct", label: "Certas" },
  ];

  const histBest = evolution.length ? Math.max(...evolution.map((e) => e.score)) : 0;

  return (
    <div className="sim-result" style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        .sim-result .sr-primary:hover { background: ${theme.fillDark}; }
        .sim-result .sr-ghost:hover { background: ${theme.surface}; }
        @keyframes sr-confetti { to { transform: translateY(720px) rotate(560deg); } }
        @media (max-width: 880px) { .sim-result .sr-top { grid-template-columns: 1fr !important; } .sim-result .sr-skills { grid-template-columns: 1fr !important; } .sim-result .sr-score-inner { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { .sim-result * { animation: none !important; transition: none !important; } }
      `}</style>

      {confetti.length > 0 ? (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60, overflow: "hidden" }}>
          {confetti.map((p, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                top: -20,
                left: `${p.left}%`,
                width: p.w,
                height: p.h,
                background: p.color,
                borderRadius: 2,
                animation: `sr-confetti ${p.dur}s linear ${p.delay}s forwards`,
              }}
            />
          ))}
        </div>
      ) : null}

      <Link
        href="/app/simulados"
        style={{ color: theme.brandInk, fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 14, display: "inline-block" }}
      >
        ← Voltar para simulados
      </Link>
      <span
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          background: theme.brandSoft,
          color: theme.brandInk,
          fontSize: 13,
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: 6,
        }}
      >
        Resultado do simulado
      </span>
      <h1 style={{ margin: "12px 0 4px", fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: theme.ink }}>
        {celebrateHead}
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: theme.muted }}>
        {title} · {finishedLabel}
      </p>

      {/* SCORE + ACTIONS */}
      <div className="sr-top" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start", marginBottom: 18 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.brandLine2}`, borderRadius: 12, padding: 26, boxShadow: "0 1px 2px rgba(2,8,23,.03)" }}>
          <div className="sr-score-inner" style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 56, fontWeight: 900, color: theme.brandInk, lineHeight: 1 }}>{displayScore}%</div>
              <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.6, color: theme.muted }}>
                {correctCount} acertos, {wrongCount} erros, {totalQuestions} questões no total.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 18 }}>
                <div style={{ background: theme.surface, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 12, color: theme.muted }}>Acertos</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: theme.brandInk }}>{correctCount}</div>
                </div>
                <div style={{ background: theme.surface, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 12, color: theme.muted }}>Erros</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#b45309" }}>{wrongCount}</div>
                </div>
                <div style={{ background: theme.surface, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 12, color: theme.muted }}>Total</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: theme.ink }}>{totalQuestions}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r={RING_RADIUS} fill="none" stroke={theme.line} strokeWidth="18" />
                <circle
                  cx="90"
                  cy="90"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={theme.brandInk}
                  strokeWidth="18"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC.toFixed(1)}
                  strokeDashoffset={ringOffset.toFixed(1)}
                  transform="rotate(-90 90 90)"
                />
                <text x="90" y="84" textAnchor="middle" fontSize="30" fontWeight="800" fill={theme.brandInk}>
                  {displayScore}%
                </text>
                <text x="90" y="108" textAnchor="middle" fontSize="13" fontWeight="600" fill={theme.muted}>
                  {correctCount}/{totalQuestions} certas
                </text>
              </svg>
            </div>
          </div>
        </div>

        <div style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 22, boxShadow: "0 1px 2px rgba(2,8,23,.03)" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: theme.ink }}>Ações</h3>
          <Link
            href={`/app/simulados/${simulationId}`}
            className="sr-primary"
            style={{
              width: "100%",
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
              marginBottom: 10,
              transition: "background .18s",
            }}
          >
            Refazer simulado
          </Link>
          <Link
            href="/app/revisoes"
            className="sr-ghost"
            style={{
              width: "100%",
              height: 40,
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
            Abrir revisões
          </Link>
          <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.55, color: theme.muted }}>{readingTip}</p>
        </div>
      </div>

      {/* EVOLUTION */}
      {evolution.length > 1 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 22, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.ink }}>Sua evolução</h3>
            <span style={{ fontSize: 13, color: theme.muted }}>{evolutionSummary}</span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: theme.muted }}>Comparação entre suas tentativas neste simulado.</p>
          <div style={{ display: "grid", gap: 10 }}>
            {evolution.map((e, i) => {
              const isBest = e.score === histBest;
              const deltaLabel = e.delta == null ? "1ª" : e.delta > 0 ? `+${e.delta}` : e.delta < 0 ? String(e.delta) : "=";
              const deltaBg =
                e.delta == null ? theme.chip : e.delta > 0 ? theme.brandSoft : e.delta < 0 ? "#fef2f2" : theme.chip;
              const deltaColor =
                e.delta == null ? theme.muted : e.delta > 0 ? theme.brandInk : e.delta < 0 ? "#b91c1c" : theme.muted;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px", gap: 14, alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: theme.muted }}>{e.dateLabel}</div>
                  <div style={{ height: 24, borderRadius: 6, background: theme.chip, overflow: "hidden", position: "relative" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 6,
                        background: isBest ? theme.fill : theme.brandMid,
                        width: `${e.score}%`,
                        transition: "width .6s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: isBest ? theme.brandInk : theme.ink2 }}>{e.score}%</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: deltaBg, color: deltaColor }}>
                      {deltaLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* STRONG / WEAK */}
      <div className="sr-skills" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 22 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: theme.ink }}>Pontos fortes</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: theme.muted }}>Assuntos com boa taxa de acerto neste envio.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {strongSkills.length > 0 ? (
              strongSkills.map((s, i) => (
                <div key={i} style={{ background: theme.brandSoft, color: theme.brandInk, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 13 }}>{s.detail}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>Nenhum item destacado nesta tentativa.</p>
            )}
          </div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 22 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: theme.ink }}>Pontos fracos</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: theme.muted }}>Assuntos que merecem revisão antes de refazer.</p>
          <div style={{ display: "grid", gap: 8 }}>
            {weakSkills.length > 0 ? (
              weakSkills.map((s, i) => (
                <div key={i} style={{ background: "#fff7ed", color: "#9a5b1d", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{s.label}</div>
                  <div style={{ fontSize: 13 }}>{s.detail}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>
                Nenhum ponto fraco nesta tentativa. Mantenha a revisão espaçada.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div style={{ background: theme.brandSoft, border: `1px solid ${theme.brandLine2}`, borderRadius: 12, padding: 22, marginBottom: 18 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 18, fontWeight: 700, color: theme.brandInk }}>Recomendações de revisão</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {recommendations.map((r, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.7)", borderRadius: 8, padding: "10px 14px", fontSize: 14, lineHeight: 1.5, color: theme.brandInk }}>
              {r.title ? <div style={{ fontWeight: 700 }}>{r.title}</div> : null}
              <div>{r.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* QUESTION-BY-QUESTION REVIEW */}
      <div style={{ background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 12, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.ink }}>Revisão questão por questão</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {filterTabs.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1px solid ${active ? theme.fill : theme.line}`,
                    background: active ? theme.brandSoft : theme.card,
                    color: active ? theme.brandInk : theme.muted,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.length > 0 ? (
            filtered.map((w) => (
              <div
                key={w.id}
                style={{
                  border: `1px solid ${w.isCorrect ? theme.brandLine2 : theme.line}`,
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 14,
                  lineHeight: 1.55,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, flex: 1, color: theme.ink }}>{w.prompt}</div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 6,
                      background: w.isCorrect ? theme.brandSoft : "#fff7ed",
                      color: w.isCorrect ? theme.brandInk : "#9a5b1d",
                    }}
                  >
                    {w.isCorrect ? "Acertou" : "Errou"}
                  </span>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: theme.brandInk, fontWeight: 600 }}>{w.context}</div>
                <div style={{ marginTop: 8, color: theme.ink2 }}>
                  Sua resposta: <strong style={{ color: w.isCorrect ? theme.brandInk : "#b45309" }}>{w.your}</strong>
                </div>
                {!w.isCorrect && w.correct ? (
                  <div style={{ color: theme.ink2 }}>
                    Correta: <strong style={{ color: theme.brandInk }}>{w.correct}</strong>
                  </div>
                ) : null}
                {w.feedback ? <div style={{ marginTop: 8, color: theme.muted }}>{w.feedback}</div> : null}
                <Link
                  href={`/app/missoes/${w.missionId}`}
                  style={{ marginTop: 10, display: "inline-block", fontSize: 13, fontWeight: 600, color: theme.brandInk, textDecoration: "none" }}
                >
                  Revisar missão: {w.missionTitle}
                </Link>
              </div>
            ))
          ) : (
            <p style={{ fontSize: 14, color: theme.muted, margin: 0 }}>Nenhuma questão neste filtro.</p>
          )}
        </div>
      </div>
    </div>
  );
}
