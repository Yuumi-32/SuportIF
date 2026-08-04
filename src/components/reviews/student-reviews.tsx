"use client";

import Link from "next/link";
import { useState } from "react";

import { gradeReviewAction } from "@/server/actions/student";
import { theme } from "@/lib/appearance/palette";
import { LayoutCanvas, type CanvasBlock } from "@/components/layout/layout-canvas";
import type { BlockSize, DashboardLayoutItem } from "@/lib/appearance/layout";

export type ReviewItem = {
  id: string;
  missionId: string;
  title: string;
  moduleLabel: string;
  skillName: string | null;
  dueText: string;
  statusLabel: string;
  overdue: boolean;
  dueToday: boolean;
  retentionPercent: number;
  question: string;
  answer: string;
};

type StudentReviewsProps = {
  reviews: ReviewItem[];
  layout: DashboardLayoutItem[];
  freeLayout: boolean;
  startEditing: boolean;
};

type Filter = "all" | "overdue" | "today" | "upcoming";

const grades: Array<{ key: string; label: string; hint: string; color: string; bg: string; bd: string }> = [
  { key: "ERREI", label: "Errei", hint: "rever amanhã", color: "#b91c1c", bg: "#fef2f2", bd: "#fecaca" },
  { key: "DIFICIL", label: "Difícil", hint: "manter ritmo", color: "#9a5b1d", bg: "#fffbeb", bd: "#fde68a" },
  { key: "BOM", label: "Bom", hint: "espaçar mais", color: theme.brandInk, bg: theme.brandSoft, bd: theme.brandLine2 },
  { key: "FACIL", label: "Fácil", hint: "espaçar bastante", color: "#0d9488", bg: "#f0fdfa", bd: "#99f6e4" }
];


/** Menos itens em bloco estreito: a largura é que define o nível de detalhe. */
function limitBySize<T>(items: T[], size: BlockSize, small: number, medium: number) {
  if (size === "P") return items.slice(0, small);
  if (size === "M") return items.slice(0, medium);
  return items;
}

export function StudentReviews({
  reviews,
  layout,
  freeLayout,
  startEditing
}: StudentReviewsProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);

  const overdue = reviews.filter((r) => r.overdue);
  const today = reviews.filter((r) => r.dueToday && !r.overdue);
  const upcoming = reviews.filter((r) => !r.overdue && !r.dueToday);

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "Todas", count: reviews.length },
    { key: "overdue", label: "Atrasadas", count: overdue.length },
    { key: "today", label: "Para hoje", count: today.length },
    { key: "upcoming", label: "Em breve", count: upcoming.length }
  ];

  const visible =
    filter === "overdue" ? overdue : filter === "today" ? today : filter === "upcoming" ? upcoming : reviews;

  const averageRetention =
    reviews.length > 0
      ? Math.round(reviews.reduce((sum, r) => sum + r.retentionPercent, 0) / reviews.length)
      : 0;

  const stats = [
    { title: "Revisões ativas", value: String(reviews.length), desc: "Pendentes na sua fila.", danger: false },
    { title: "Atrasadas", value: String(overdue.length), desc: "Prioridade máxima.", danger: overdue.length > 0 },
    { title: "Para hoje", value: String(today.length), desc: "Vencem hoje.", danger: false },
    { title: "Fixação média", value: `${averageRetention}%`, desc: "Avanço na escada de revisões.", danger: false }
  ];

  const blocks: CanvasBlock[] = [
    {
      id: "reviews-header",
      render: (size) => (
        <>
          {/* HEADER */}
          <div style={{ animation: "rv-rise .5s ease both" }}>
            <span style={{ display: "inline-flex", alignItems: "center", background: theme.brandSoft, color: theme.brandInk, border: `1px solid ${theme.brandLine2}`, borderRadius: 6, padding: "4px 11px", fontSize: 12.5, fontWeight: 600 }}>
              REVISÃO ESPAÇADA
            </span>
            <h1 style={{ margin: "14px 0 0", fontSize: 32, fontWeight: 900, lineHeight: 1.12, color: theme.ink }}>
              Minhas Revisões
            </h1>
            {size !== "P" ? (
              <p style={{ margin: "10px 0 0", maxWidth: "62ch", fontSize: 15.5, lineHeight: 1.6, color: theme.ink2 }}>
                Revise no momento certo para fixar o conteúdo. O que está atrasado aparece primeiro.
              </p>
            ) : null}
            <div style={{ margin: "12px 0 0", height: 2, width: 48, background: theme.fill, borderRadius: 999 }} />
          </div>
        </>
      )
    },
    {
      id: "reviews-stats",
      render: (size) => (
        <>
          {/* STATS */}
          <div className="rv-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, animation: "rv-rise .5s ease both", animationDelay: ".05s" }}>
            {limitBySize(stats, size, 2, 4).map((st) => (
              <div
                key={st.title}
                className="rv-stat"
                style={{
                  background: theme.card,
                  border: `1px solid ${st.danger ? "#fcd9b6" : theme.line}`,
                  borderRadius: 8,
                  boxShadow: "0 1px 2px rgba(2,8,23,.03)",
                  padding: 20,
                  transition: "all .2s"
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.muted }}>{st.title}</p>
                <p style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 900, color: st.danger ? "#b45309" : theme.brandInk, lineHeight: 1 }}>
                  {st.value}
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.45, color: theme.faint }}>{st.desc}</p>
              </div>
            ))}
          </div>
        </>
      )
    },
    {
      id: "reviews-filters",
      render: () => (
        <>
          {/* FILTERS */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", animation: "rv-rise .5s ease both", animationDelay: ".1s" }}>
            {chips.map((chip) => {
              const active = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => setFilter(chip.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    height: 38,
                    padding: "0 14px",
                    borderRadius: 999,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: active ? `1px solid ${theme.fill}` : `1px solid ${theme.line}`,
                    background: active ? theme.fill : theme.card,
                    color: active ? "#fff" : theme.ink2
                  }}
                >
                  {chip.label}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 20,
                      height: 18,
                      padding: "0 5px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: active ? "rgba(255,255,255,.25)" : theme.chip,
                      color: active ? "#fff" : theme.muted
                    }}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
            <p style={{ margin: "0 0 0 auto", fontSize: 13, color: theme.faint, fontWeight: 500 }}>
              Mostrando <b style={{ fontWeight: 800, color: theme.muted }}>{visible.length}</b> revisões
            </p>
          </div>
        </>
      )
    },
    {
      id: "reviews-list",
      render: (size) => (
        <>
          {/* LIST */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "rv-rise .5s ease both", animationDelay: ".15s" }}>
            {limitBySize(visible, size, 3, 6).map((review) => {
              const isOpen = openId === review.id;
              const isRevealed = revealedId === review.id;
              return (
                <div
                  key={review.id}
                  style={{
                    background: theme.card,
                    border: `1px solid ${review.overdue ? "#fcd9b6" : theme.line}`,
                    borderRadius: 12,
                    boxShadow: "0 1px 2px rgba(2,8,23,.03)",
                    overflow: "hidden"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        flexShrink: 0,
                        fontSize: 18,
                        background: review.overdue ? "#fff7ed" : theme.brandSoft,
                        color: review.overdue ? "#b45309" : theme.brandInk
                      }}
                    >
                      ↻
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink }}>{review.title}</h3>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: 6,
                            background: review.overdue ? "#fff7ed" : theme.chip,
                            color: review.overdue ? "#9a5b1d" : theme.ink2
                          }}
                        >
                          {review.dueText}
                        </span>
                        {review.skillName ? (
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: theme.brandSoft, color: theme.brandInk }}>
                            {review.skillName}
                          </span>
                        ) : null}
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: theme.muted }}>{review.moduleLabel}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9, maxWidth: 340 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: theme.faint, whiteSpace: "nowrap" }}>Fixação</span>
                        <div style={{ flex: 1, height: 6, background: theme.line, borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 999, background: theme.fill, width: `${review.retentionPercent}%`, transition: "width .7s cubic-bezier(.22,1,.36,1)" }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.brandInk }}>{review.retentionPercent}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOpenId(isOpen ? null : review.id);
                        setRevealedId(null);
                      }}
                      className="rv-primary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        height: 40,
                        padding: "0 18px",
                        background: theme.fill,
                        color: "#fff",
                        border: "none",
                        borderRadius: 7,
                        fontWeight: 600,
                        fontSize: 13.5,
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(91,33,182,.22)",
                        flexShrink: 0
                      }}
                    >
                      {isOpen ? "Fechar" : "Revisar agora"}
                    </button>
                  </div>

                  {isOpen ? (
                    <div style={{ borderTop: `1px solid ${theme.line}`, background: theme.surface, padding: "18px 20px" }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: theme.brandInk }}>
                        Pergunta
                      </p>
                      <p style={{ margin: "8px 0 0", fontSize: 15.5, lineHeight: 1.6, color: theme.ink, fontWeight: 600 }}>
                        {review.question}
                      </p>

                      {isRevealed ? (
                        <>
                          <div style={{ marginTop: 16, background: theme.card, border: `1px solid ${theme.line}`, borderRadius: 8, padding: 16 }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#0d9488" }}>
                              Resposta
                            </p>
                            <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.6, color: theme.ink2 }}>{review.answer}</p>
                            <Link
                              href={`/app/missoes/${review.missionId}`}
                              style={{ marginTop: 12, display: "inline-block", fontSize: 13, fontWeight: 600, color: theme.brandInk, textDecoration: "none" }}
                            >
                              Abrir missão completa →
                            </Link>
                          </div>

                          <div style={{ marginTop: 16 }}>
                            <p style={{ margin: "0 0 9px", fontSize: 12.5, fontWeight: 600, color: theme.muted }}>
                              Como foi lembrar disso?
                            </p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {grades.map((g) => (
                                <form key={g.key} action={gradeReviewAction}>
                                  <input type="hidden" name="reviewId" value={review.id} />
                                  <input type="hidden" name="grade" value={g.key} />
                                  <button
                                    type="submit"
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-start",
                                      gap: 2,
                                      padding: "8px 14px",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                      border: `1px solid ${g.bd}`,
                                      background: g.bg,
                                      color: g.color,
                                      fontSize: 13.5,
                                      fontWeight: 700
                                    }}
                                  >
                                    {g.label}
                                    <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{g.hint}</span>
                                  </button>
                                </form>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                          <button
                            onClick={() => setRevealedId(review.id)}
                            className="rv-primary"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 7,
                              height: 40,
                              padding: "0 18px",
                              background: theme.fill,
                              color: "#fff",
                              border: "none",
                              borderRadius: 7,
                              fontWeight: 600,
                              fontSize: 13.5,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(91,33,182,.22)"
                            }}
                          >
                            Mostrar Resposta
                          </button>
                          <button
                            onClick={() => setOpenId(null)}
                            className="rv-ghost"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              height: 40,
                              padding: "0 16px",
                              background: theme.card,
                              color: theme.muted,
                              border: `1px solid ${theme.line}`,
                              borderRadius: 7,
                              fontWeight: 600,
                              fontSize: 13.5,
                              cursor: "pointer"
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", background: theme.card, border: `1px dashed ${theme.line2}`, borderRadius: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink2 }}>Nada por Aqui</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.faint }}>
                {reviews.length === 0 ? "Você está em dia com suas revisões." : "Nenhuma revisão neste filtro. Experimente outro."}
              </p>
            </div>
          ) : null}
        </>
      )
    }
  ];

  return (
    <div className="revs" style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <style>{`
        .revs .rv-stat:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(2,8,23,.07); border-color: ${theme.fill}; }
        .revs .rv-primary:hover { background: ${theme.fillDark} !important; }
        .revs .rv-ghost:hover { background: ${theme.surface}; }
        @keyframes rv-rise { from { transform: translateY(14px); } to { transform: none; } }
        @media (max-width: 900px) { .revs .rv-stats { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 520px) { .revs .rv-stats { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { .revs * { animation: none !important; transition: none !important; } }
      `}</style>

      <LayoutCanvas
        page="revisoes"
        blocks={blocks}
        layout={layout}
        freeLayout={freeLayout}
        startEditing={startEditing}
      />
    </div>
  );
}
