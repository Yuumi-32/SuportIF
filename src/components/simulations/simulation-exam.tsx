"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { submitSimulationAction, type SubmitSimulationState } from "@/server/actions/simulations";
import { theme } from "@/lib/appearance/palette";

type ExamQuestion = {
  id: string;
  order: number;
  exercise: {
    id: string;
    prompt: string;
    mission: {
      title: string;
      module: {
        title: string;
        track: { title: string };
      };
    };
    options: Array<{ id: string; text: string }>;
  };
};

type SimulationExamProps = {
  simulationId: string;
  title: string;
  typeLabel: string;
  relationLabel: string;
  questions: ExamQuestion[];
};

const initialState: SubmitSimulationState = { status: "idle" };

const chipBadge = (bg: string, color: string): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 6,
  background: bg,
  color,
  display: "inline-flex",
  alignItems: "center",
});

function fmtClock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SimulationExam({ simulationId, title, typeLabel, relationLabel, questions }: SimulationExamProps) {
  const [state, formAction, isPending] = useActionState(submitSimulationAction, initialState);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const total = questions.length;
  const current = questions[idx];
  const exId = current.exercise.id;
  const answeredCount = questions.filter((q) => answers[q.exercise.id]).length;
  const pending = total - answeredCount;
  const pct = total === 0 ? 0 : Math.round((answeredCount / total) * 100);
  const isAnswered = Boolean(answers[exId]);
  const isMarked = Boolean(marks[exId]);

  function selectOption(optionId: string) {
    setAnswers((prev) => ({ ...prev, [exId]: optionId }));
  }
  function clearAnswer() {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[exId];
      return next;
    });
  }
  function toggleMark() {
    setMarks((prev) => ({ ...prev, [exId]: !prev[exId] }));
  }
  function goPending() {
    const i = questions.findIndex((q) => !answers[q.exercise.id]);
    if (i >= 0) setIdx(i);
  }

  return (
    <div className="sim-exam" style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        .sim-exam .se-opt:hover { background: ${theme.surface}; }
        .sim-exam .se-ghost:hover { background: ${theme.surface}; }
        .sim-exam .se-primary:hover { background: ${theme.fillDark}; }
        @keyframes se-pop { from { transform: scale(.985); } to { transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .sim-exam * { animation: none !important; transition: none !important; } }
      `}</style>

      <Link
        href="/app/simulados"
        style={{
          color: theme.brandInk,
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
          marginBottom: 14,
          display: "inline-block",
        }}
      >
        ← Voltar para simulados
      </Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <span style={chipBadge(theme.chip, theme.ink2)}>{typeLabel}</span>
        <span style={chipBadge(theme.brandSoft, theme.brandInk)}>{relationLabel}</span>
      </div>
      <h1 style={{ margin: "0 0 18px", fontSize: 28, fontWeight: 800, lineHeight: 1.2, color: theme.ink }}>{title}</h1>

      <form action={formAction}>
        <input type="hidden" name="simulationId" value={simulationId} />
        {questions.map((q) => (
          <input key={`ex-${q.exercise.id}`} type="hidden" name="exerciseId" value={q.exercise.id} />
        ))}
        {questions.map((q) =>
          answers[q.exercise.id] ? (
            <input
              key={`ans-${q.exercise.id}`}
              type="hidden"
              name={`answer-${q.exercise.id}`}
              value={answers[q.exercise.id]}
            />
          ) : null
        )}

        {/* STICKY PROGRESS + NAVIGATOR */}
        <div
          style={{
            position: "sticky",
            top: 64,
            zIndex: 20,
            background: "rgba(248,250,252,.97)",
            backdropFilter: "blur(6px)",
            border: `1px solid ${theme.line}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: theme.card,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontVariantNumeric: "tabular-nums",
                  color: theme.ink,
                }}
              >
                ⏱ {fmtClock(elapsed)}
              </span>
              <span style={{ color: theme.muted }}>
                Questão {idx + 1} de {total}
              </span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: theme.brandInk }}>{pct}% respondido</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: theme.line, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                background: theme.fill,
                width: `${pct}%`,
                transition: "width .5s cubic-bezier(.22,1,.36,1)",
              }}
            />
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
            {questions.map((q, i) => {
              const cur = i === idx;
              const ans = Boolean(answers[q.exercise.id]);
              const mk = Boolean(marks[q.exercise.id]);
              let bg = theme.card;
              let border = theme.line;
              let color = theme.faint;
              let shadow = "none";
              if (ans) {
                bg = theme.brandSoft;
                border = theme.fill;
                color = theme.brandInk;
              }
              if (mk) border = "#f59e0b";
              if (cur) {
                border = theme.fill;
                color = theme.brandInk;
                shadow = `0 0 0 2px ${theme.brandLine2}`;
                if (!ans) bg = theme.card;
              }
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  style={{
                    position: "relative",
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `1px solid ${border}`,
                    background: bg,
                    color,
                    boxShadow: shadow,
                    transition: "all .15s ease",
                  }}
                >
                  {i + 1}
                  {mk ? (
                    <span
                      style={{
                        position: "absolute",
                        top: -3,
                        right: -3,
                        width: 9,
                        height: 9,
                        borderRadius: 999,
                        background: "#f59e0b",
                        border: `2px solid ${theme.card}`,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* QUESTION CARD */}
        <div
          key={current.id}
          style={{
            background: theme.card,
            border: `1px solid ${isAnswered ? theme.brandLine2 : theme.line}`,
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 1px 2px rgba(2,8,23,.03)",
            animation: "se-pop .25s ease both",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <span style={chipBadge(theme.chip, theme.ink2)}>Questão {idx + 1}</span>
            {isAnswered ? (
              <span style={chipBadge(theme.fill, theme.onFill)}>Respondida</span>
            ) : (
              <span style={{ ...chipBadge(theme.card, theme.muted), border: `1px solid ${theme.line}` }}>Pendente</span>
            )}
            {isMarked ? <span style={chipBadge("#fff7ed", "#9a5b1d")}>Marcada para revisar</span> : null}
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, lineHeight: 1.3, color: theme.ink }}>
            {current.exercise.prompt}
          </h2>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.brandInk, marginBottom: 16 }}>
            {current.exercise.mission.module.track.title} · {current.exercise.mission.title}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {current.exercise.options.map((opt) => {
              const selected = answers[exId] === opt.id;
              return (
                <div
                  key={opt.id}
                  className="se-opt"
                  onClick={() => selectOption(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    border: `1px solid ${selected ? theme.fill : theme.line}`,
                    background: selected ? theme.brandSoft : theme.card,
                    borderRadius: 8,
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "background .15s ease, border-color .15s ease",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      border: `2px solid ${selected ? theme.fill : theme.line2}`,
                      background: selected ? theme.fill : theme.card,
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      marginTop: 1,
                    }}
                  >
                    {selected ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: theme.ink }}>{opt.text}</span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
              paddingTop: 16,
              borderTop: `1px solid ${theme.chip}`,
            }}
          >
            <button
              type="button"
              onClick={toggleMark}
              style={{
                height: 38,
                padding: "0 16px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: `1px solid ${isMarked ? "#f59e0b" : theme.line}`,
                background: isMarked ? "#fff7ed" : theme.card,
                color: isMarked ? "#9a5b1d" : theme.ink2,
              }}
            >
              {isMarked ? "Remover marcação" : "Marcar para revisar"}
            </button>
            <button
              type="button"
              onClick={clearAnswer}
              disabled={!isAnswered}
              className="se-ghost"
              style={{
                height: 38,
                padding: "0 16px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                border: `1px solid ${theme.line}`,
                background: theme.card,
                color: isAnswered ? theme.ink2 : theme.line2,
                cursor: isAnswered ? "pointer" : "not-allowed",
              }}
            >
              Limpar resposta
            </button>
          </div>
        </div>

        {state.status === "error" ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 8,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#b91c1c",
              padding: "12px 14px",
              fontSize: 14,
            }}
          >
            {state.message}
          </div>
        ) : null}

        {/* FOOTER NAV */}
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            style={{
              height: 42,
              padding: "0 22px",
              border: `1px solid ${theme.line}`,
              borderRadius: 6,
              background: theme.card,
              fontSize: 14,
              fontWeight: 700,
              color: idx > 0 ? theme.ink : theme.line2,
              cursor: idx > 0 ? "pointer" : "not-allowed",
            }}
          >
            ← Anterior
          </button>

          {idx < total - 1 ? (
            <button
              type="button"
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              className="se-ghost"
              style={{
                height: 42,
                padding: "0 22px",
                border: `1px solid ${theme.line}`,
                borderRadius: 6,
                background: theme.card,
                color: theme.ink,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Próxima →
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending > 0 || isPending}
              className={pending > 0 ? undefined : "se-primary"}
              style={{
                height: 42,
                padding: "0 22px",
                border: 0,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                background: pending > 0 || isPending ? theme.line2 : theme.fill,
                color: "#fff",
                cursor: pending > 0 || isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Enviando..." : "Enviar simulado"}
            </button>
          )}

          <span style={{ marginLeft: "auto", fontSize: 13, color: theme.muted }}>
            {pending > 0 ? `${pending} questão(ões) ainda sem resposta.` : "Tudo respondido — pode enviar."}
          </span>

          {pending > 0 ? (
            <button
              type="button"
              onClick={goPending}
              style={{
                height: 42,
                padding: "0 16px",
                border: "1px solid #fcd9b6",
                borderRadius: 6,
                background: "#fff7ed",
                color: "#9a5b1d",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Ir para pendente
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
