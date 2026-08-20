"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getTrackIcon } from "@/lib/learning/presentation";
import { getIntervalDaysForGrade, type ReviewGrade } from "@/lib/reviews/schedule";
import { gradeReviewAction } from "@/server/actions/student";
import { theme } from "@/lib/appearance/palette";
import { LayoutCanvas, type CanvasBlock } from "@/components/layout/layout-canvas";
import type { BlockSize, DashboardLayoutItem } from "@/lib/appearance/layout";

/// Em que degrau do prazo a revisão está. É o eixo da página inteira: colore o
/// cartão, alimenta os quatro números do resumo e é o que os filtros recortam.
export type ReviewBucket = "late" | "today" | "week" | "mastered";

export type ReviewItem = {
  id: string;
  missionId: string;
  title: string;
  moduleLabel: string;
  trackIcon: string;
  dueText: string;
  bucket: ReviewBucket;
  intervalDays: number;
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

type Filter = "all" | ReviewBucket;

type BucketTone = { label: string; bg: string; color: string; border: string; ink: string };

/// Tons de prazo. O trio `bg`/`color`/`border` desenha a pílula clara e é fixo
/// de propósito — é semântico (vermelho = atrasado, verde = dominado) e não
/// segue a personalização de cor da conta. `ink` é a mesma cor quando ela vira
/// tinta direto sobre o cartão, aí sim acompanhando o tema claro/escuro.
const bucketTones: Record<ReviewBucket, BucketTone> = {
  late: { label: "Atrasada", bg: theme.dangerSoft, color: theme.danger, border: "#fecaca", ink: theme.dangerInk },
  today: { label: "Revisar Hoje", bg: "#ffedd5", color: "#c2410c", border: "#fed7aa", ink: theme.todayInk },
  week: { label: "Esta Semana", bg: theme.warnSoft, color: theme.warn, border: "#fde68a", ink: theme.warnInk },
  mastered: { label: "Dominada", bg: theme.okSoft, color: theme.ok, border: "#bbf7d0", ink: theme.okInk }
};

const bucketOrder: Record<ReviewBucket, number> = { late: 0, today: 1, week: 2, mastered: 3 };

const gradeDefs: Array<{ key: ReviewGrade; label: string; bg: string; color: string; border: string }> = [
  { key: "ERREI", label: "Errei", bg: "#fef2f2", color: theme.danger, border: "#fecaca" },
  { key: "DIFICIL", label: "Difícil", bg: "#fffbeb", color: theme.warn, border: "#fde68a" },
  { key: "BOM", label: "Bom", bg: theme.brandTint, color: theme.brandInk, border: theme.brandLine2 },
  { key: "FACIL", label: "Fácil", bg: "#f0fdf4", color: theme.ok, border: "#bbf7d0" }
];

/**
 * A dica embaixo da nota é o prazo que ela realmente agenda, calculado pela
 * mesma escada que o servidor usa ao gravar a próxima revisão.
 */
function gradeHint(grade: ReviewGrade, intervalDays: number) {
  const days = getIntervalDaysForGrade(grade, intervalDays);
  return days === 1 ? "amanhã" : `em ${days} dias`;
}

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** Menos itens em bloco estreito: a largura é que define o nível de detalhe. */
function limitBySize<T>(items: T[], size: BlockSize, small: number, medium: number) {
  if (size === "P") return items.slice(0, small);
  if (size === "M") return items.slice(0, medium);
  return items;
}

function ReviewGlyph({ icon, title, tone }: { icon: string; title: string; tone: BucketTone }) {
  const Icon = getTrackIcon(icon);
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 10,
        flexShrink: 0,
        fontWeight: 800,
        fontSize: 16,
        background: tone.bg,
        color: tone.color
      }}
    >
      {Icon ? <Icon style={{ width: 20, height: 20 }} aria-hidden="true" /> : title.charAt(0).toUpperCase()}
    </span>
  );
}

export function StudentReviews({ reviews, layout, freeLayout, startEditing }: StudentReviewsProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tCount, setTCount] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setMounted(true);
      setTCount(1);
      return;
    }
    setMounted(true);
    const start = performance.now();
    const duration = 900;
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / duration);
      setTCount(easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    });
    // Aba em segundo plano congela o requestAnimationFrame. Sem esta rede de
    // segurança, quem abre a página numa aba de fundo encontra os números
    // parados em zero até a aba receber foco.
    const fallback = window.setTimeout(() => setTCount((value) => (value === 0 ? 1 : value)), 1500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, []);

  const counts = useMemo(() => {
    const byBucket: Record<ReviewBucket, number> = { late: 0, today: 0, week: 0, mastered: 0 };
    reviews.forEach((review) => {
      byBucket[review.bucket] += 1;
    });
    return byBucket;
  }, [reviews]);

  // O que está mais atrasado vem primeiro e, dentro do mesmo prazo, o que está
  // menos fixado — a fila já entrega o próximo passo no topo.
  const visible = useMemo(
    () =>
      reviews
        .filter((review) => filter === "all" || review.bucket === filter)
        .sort(
          (a, b) => bucketOrder[a.bucket] - bucketOrder[b.bucket] || a.retentionPercent - b.retentionPercent
        ),
    [reviews, filter]
  );

  const stats: Array<{ title: string; value: string; desc: string; color: string }> = [
    {
      title: "Atrasadas",
      value: String(Math.round(counts.late * tCount)),
      desc: "Prioridade máxima hoje.",
      color: theme.dangerInk
    },
    {
      title: "Para Hoje",
      value: String(Math.round(counts.today * tCount)),
      desc: "No ponto certo de revisão.",
      color: theme.todayInk
    },
    {
      title: "Esta Semana",
      value: String(Math.round(counts.week * tCount)),
      desc: "Chegando nos próximos dias.",
      color: theme.warnInk
    },
    {
      title: "Dominadas",
      value: String(Math.round(counts.mastered * tCount)),
      desc: "Fixadas na memória longa.",
      color: theme.okInk
    }
  ];

  const chips: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "Todas", count: reviews.length },
    { key: "late", label: "Atrasadas", count: counts.late },
    { key: "today", label: "Hoje", count: counts.today },
    { key: "week", label: "Esta Semana", count: counts.week },
    { key: "mastered", label: "Dominadas", count: counts.mastered }
  ];

  const blocks: CanvasBlock[] = [
    {
      id: "reviews-header",
      render: (size) => (
        <>
          {/* PAGE HEADER */}
          <div style={{ animation: "rv-rise .5s ease both" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: theme.brandSoft,
                color: theme.brandInk,
                border: `1px solid ${theme.brandLine2}`,
                borderRadius: 6,
                padding: "4px 11px",
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
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
          {/* SUMMARY */}
          <div
            className="rv-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 16,
              animation: "rv-rise .5s ease both",
              animationDelay: ".05s"
            }}
          >
            {limitBySize(stats, size, 2, 4).map((st) => (
              <div
                key={st.title}
                className="rv-stat"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 8,
                  boxShadow: "0 1px 2px rgba(2,8,23,.03)",
                  padding: 20,
                  transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease"
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.muted }}>{st.title}</p>
                <p style={{ margin: "8px 0 0", fontSize: 30, fontWeight: 900, color: st.color, lineHeight: 1 }}>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              animation: "rv-rise .5s ease both",
              animationDelay: ".1s"
            }}
          >
            {chips.map((chip) => {
              const active = filter === chip.key;
              return (
                <button
                  key={chip.key}
                  onClick={() => {
                    setFilter(chip.key);
                    setOpenId(null);
                    setRevealedId(null);
                  }}
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
                    transition: "all .16s",
                    border: active ? `1px solid ${theme.fill}` : `1px solid ${theme.line}`,
                    background: active ? theme.fill : theme.card,
                    color: active ? theme.onFill : theme.ink2
                  }}
                >
                  {chip.label}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 20,
                      height: 20,
                      padding: "0 6px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 700,
                      background: active ? "rgba(255,255,255,.22)" : theme.chip,
                      color: active ? theme.onFill : theme.muted
                    }}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
            <p style={{ margin: "0 0 0 auto", fontSize: 13, color: theme.faint, fontWeight: 500 }}>
              Mostrando{" "}
              <b style={{ fontWeight: 800, color: theme.muted }}>
                {visible.length} de {reviews.length}
              </b>{" "}
              revisões
            </p>
          </div>
        </>
      )
    },
    {
      id: "reviews-list",
      render: (size) => (
        <>
          {/* REVIEW LIST */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              animation: "rv-rise .5s ease both",
              animationDelay: ".15s"
            }}
          >
            {limitBySize(visible, size, 3, 6).map((review) => {
              const tone = bucketTones[review.bucket];
              const isOpen = openId === review.id;
              const isRevealed = isOpen && revealedId === review.id;

              return (
                <div
                  key={review.id}
                  style={{
                    background: theme.card,
                    border: `1px solid ${isOpen ? theme.brandMid : review.bucket === "late" ? "hsl(var(--danger-ink) / 0.4)" : theme.line}`,
                    borderRadius: 10,
                    boxShadow: isOpen ? "0 8px 24px rgba(91,33,182,.10)" : "0 1px 2px rgba(2,8,23,.03)",
                    overflow: "hidden",
                    transition: "border-color .2s ease, box-shadow .2s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", flexWrap: "wrap" }}>
                    <ReviewGlyph icon={review.trackIcon} title={review.title} tone={tone} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink }}>{review.title}</h3>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: 999,
                            padding: "3px 10px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            background: tone.bg,
                            color: tone.color,
                            border: `1px solid ${tone.border}`
                          }}
                        >
                          {tone.label}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: theme.muted }}>
                        {review.moduleLabel} · {review.dueText}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9, maxWidth: 340 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: theme.faint, whiteSpace: "nowrap" }}>
                          Retenção
                        </span>
                        <div style={{ flex: 1, height: 6, background: theme.line, borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 999,
                              background: tone.ink,
                              width: mounted ? `${review.retentionPercent}%` : "0%",
                              transition: "width .9s cubic-bezier(.22,1,.36,1)"
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: tone.ink }}>
                          {review.retentionPercent}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setOpenId(isOpen ? null : review.id);
                        setRevealedId(null);
                      }}
                      className={isOpen ? "rv-btn-open" : "rv-btn"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 38,
                        padding: "0 16px",
                        borderRadius: 7,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all .18s",
                        background: isOpen ? theme.chip : theme.card,
                        color: isOpen ? theme.ink2 : theme.brandInk,
                        border: `1px solid ${isOpen ? theme.line : theme.brandMid}`
                      }}
                    >
                      {isOpen ? "Fechar" : "Revisar"}
                    </button>
                  </div>

                  {isOpen ? (
                    <div style={{ padding: "18px 20px 20px", borderTop: `1px solid ${theme.line}`, background: theme.surface }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: ".06em",
                          textTransform: "uppercase",
                          color: theme.brandInk
                        }}
                      >
                        Pergunta
                      </p>
                      <p style={{ margin: "8px 0 0", fontSize: 15.5, lineHeight: 1.6, color: theme.ink, fontWeight: 600 }}>
                        {review.question}
                      </p>

                      {isRevealed ? (
                        <>
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${theme.line2}` }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: ".06em",
                                textTransform: "uppercase",
                                color: theme.ok
                              }}
                            >
                              Resposta
                            </p>
                            <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.6, color: theme.ink2 }}>
                              {review.answer}
                            </p>
                            <Link
                              href={`/app/missoes/${review.missionId}`}
                              style={{
                                marginTop: 12,
                                display: "inline-block",
                                fontSize: 13,
                                fontWeight: 600,
                                color: theme.brandInk,
                                textDecoration: "none"
                              }}
                            >
                              Abrir missão completa →
                            </Link>
                          </div>

                          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${theme.line}` }}>
                            <p style={{ margin: "0 0 9px", fontSize: 12.5, fontWeight: 600, color: theme.muted }}>
                              Como foi lembrar disso?
                            </p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {gradeDefs.map((g) => (
                                <form key={g.key} action={gradeReviewAction}>
                                  <input type="hidden" name="reviewId" value={review.id} />
                                  <input type="hidden" name="grade" value={g.key} />
                                  <button
                                    type="submit"
                                    className="rv-grade"
                                    style={{
                                      display: "inline-flex",
                                      flexDirection: "column",
                                      alignItems: "flex-start",
                                      gap: 2,
                                      padding: "9px 14px",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                      transition: "all .15s",
                                      background: g.bg,
                                      color: g.color,
                                      border: `1px solid ${g.border}`,
                                      fontSize: 13.5,
                                      fontWeight: 700
                                    }}
                                  >
                                    {g.label}
                                    <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.7, color: g.color }}>
                                      {gradeHint(g.key, review.intervalDays)}
                                    </span>
                                  </button>
                                </form>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", gap: 9, marginTop: 16, flexWrap: "wrap" }}>
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
                              color: theme.onFill,
                              border: "none",
                              borderRadius: 7,
                              fontWeight: 600,
                              fontSize: 13.5,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(91,33,182,.22)",
                              transition: "all .18s"
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
                              cursor: "pointer",
                              transition: "all .18s"
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
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: theme.card,
                border: `1px dashed ${theme.line2}`,
                borderRadius: 12
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink2 }}>Nada por Aqui</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.faint }}>
                {reviews.length === 0
                  ? "Você está em dia com suas revisões."
                  : "Nenhuma revisão neste filtro. Experimente outro."}
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
        .revs .rv-stat:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(2,8,23,.07); border-color: ${theme.brandLine2}; }
        .revs .rv-btn:hover { background: ${theme.brandSoft}; }
        .revs .rv-btn-open:hover { background: ${theme.line}; }
        .revs .rv-primary:hover { background: ${theme.fillDark}; }
        .revs .rv-ghost:hover { background: ${theme.surface}; }
        .revs .rv-grade:hover { filter: brightness(.97); }
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

      <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: 12.5, color: theme.faint }}>
        Conteúdo demonstrativo, fictício e não oficial.
      </p>
    </div>
  );
}
