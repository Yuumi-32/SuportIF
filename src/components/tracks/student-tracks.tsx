"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getTrackIcon } from "@/lib/learning/presentation";
import { startTrackAction } from "@/server/actions/student";
import { theme } from "@/lib/appearance/palette";
import { LayoutCanvas, type CanvasBlock } from "@/components/layout/layout-canvas";
import type { BlockSize, DashboardLayoutItem } from "@/lib/appearance/layout";

export type StudentTrackItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  area: string;
  coverIcon: string;
  completedMissions: number;
  totalMissions: number;
  progressPercent: number;
};

type StudentTracksProps = {
  enrolled: StudentTrackItem[];
  available: StudentTrackItem[];
  layout: DashboardLayoutItem[];
  freeLayout: boolean;
  startEditing: boolean;
};

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** Busca sem acento: "programacao" acha "Programação". */
function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function TrackGlyph({ icon, title }: { icon: string; title: string }) {
  const Icon = getTrackIcon(icon);
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 42,
        height: 42,
        borderRadius: 10,
        background: theme.brandSoft,
        color: theme.brandInk,
        fontWeight: 800,
        fontSize: 15,
        flexShrink: 0,
      }}
    >
      {Icon ? <Icon style={{ width: 20, height: 20 }} aria-hidden="true" /> : title.charAt(0).toUpperCase()}
    </span>
  );
}

const categoryBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: theme.line,
  color: theme.ink2,
  border: `1px solid ${theme.line2}`,
  borderRadius: 6,
  padding: "4px 11px",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const cardStyle: React.CSSProperties = {
  background: theme.card,
  border: `1px solid ${theme.line}`,
  borderRadius: 12,
  boxShadow: "0 1px 2px rgba(2,8,23,.04)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
};

const ctaBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 42,
  padding: "0 18px",
  borderRadius: 7,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  textDecoration: "none",
  transition: "all .18s",
};

/**
 * Duas colunas, como no desenho. O `minmax(420px, …)` é o que garante isso na
 * largura cheia da área do aluno e, de quebra, colapsa sozinho quando o bloco
 * é estreito — o layout livre redimensiona o bloco, e media query só enxerga a
 * janela.
 */
const cardsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 18,
};

/** Menos itens em bloco estreito: a largura é que define o nível de detalhe. */
function limitBySize<T>(items: T[], size: BlockSize, small: number, medium: number) {
  if (size === "P") return items.slice(0, small);
  if (size === "M") return items.slice(0, medium);
  return items;
}

export function StudentTracks({
  enrolled,
  available,
  layout,
  freeLayout,
  startEditing
}: StudentTracksProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [mounted, setMounted] = useState(false);
  const [tCount, setTCount] = useState(0);

  // Stats over the tracks the student is enrolled in ("minha jornada").
  const baseStats = useMemo(() => {
    const totalDone = enrolled.reduce((sum, t) => sum + t.completedMissions, 0);
    const totalMissions = enrolled.reduce((sum, t) => sum + t.totalMissions, 0);
    const pctSum = enrolled.reduce((sum, t) => sum + t.progressPercent, 0);
    const finished = enrolled.filter((t) => t.totalMissions > 0 && t.completedMissions >= t.totalMissions).length;
    const avg = enrolled.length ? Math.round(pctSum / enrolled.length) : 0;
    return { active: enrolled.length, totalDone, totalMissions, avg, finished };
  }, [enrolled]);

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
    // segurança, quem abre a página numa aba de fundo encontra todos os
    // números parados em zero até a aba receber foco.
    const fallback = window.setTimeout(() => setTCount((value) => (value === 0 ? 1 : value)), 1500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, []);

  const stats = [
    {
      label: "Na Minha Jornada",
      value: String(Math.round(baseStats.active * tCount)),
      sub: baseStats.active === 1 ? "módulo ativo" : "módulos ativos",
    },
    {
      label: "Missões Concluídas",
      value: String(Math.round(baseStats.totalDone * tCount)),
      sub: `de ${baseStats.totalMissions} no total`,
    },
    {
      label: "Progresso Médio",
      value: `${Math.round(baseStats.avg * tCount)}%`,
      sub: "entre seus módulos",
    },
    {
      label: "Módulos Concluídos",
      value: String(Math.round(baseStats.finished * tCount)),
      sub: baseStats.finished === 1 ? "módulo 100%" : "módulos 100%",
    },
  ];

  // Category chips built from every track (enrolled + available).
  const allTracks = useMemo(() => [...enrolled, ...available], [enrolled, available]);
  const categories = useMemo(() => {
    const list = ["Todas"];
    allTracks.forEach((t) => {
      if (!list.includes(t.area)) list.push(t.area);
    });
    return list;
  }, [allTracks]);

  const query = normalize(search.trim());
  const matches = (t: StudentTrackItem) =>
    (category === "Todas" || t.area === category) &&
    (query === "" ||
      normalize(t.title).includes(query) ||
      normalize(t.area).includes(query) ||
      normalize(t.description).includes(query));

  const visEnrolled = enrolled.filter(matches);
  const visAvailable = available.filter(matches);
  const visibleTotal = visEnrolled.length + visAvailable.length;
  const noResults = visibleTotal === 0;

  const blocks: CanvasBlock[] = [
    {
      id: "tracks-header",
      render: (size) => (
        <>
          {/* PAGE HEADER */}
          <div style={{ animation: "st-riseIn .5s ease both" }}>
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
                fontWeight: 600,
              }}
            >
              CAMINHOS DE ESTUDOS DISPONÍVEIS
            </span>
            <h1 style={{ margin: "14px 0 0", fontSize: 32, fontWeight: 900, lineHeight: 1.12, color: theme.ink }}>
              Meus Módulos
            </h1>
            {size !== "P" ? (
              <p style={{ margin: "10px 0 0", maxWidth: "62ch", fontSize: 15.5, lineHeight: 1.6, color: theme.ink2 }}>
                Continue o que já começou ou escolha um novo módulo demonstrativo para estudar em etapas.
              </p>
            ) : null}
            <div style={{ margin: "12px 0 0", height: 2, width: 48, background: theme.fill, borderRadius: 999 }} />
          </div>
        </>
      )
    },
    {
      id: "tracks-stats",
      render: (size) => (
        <>
          {/* STATS */}
          <div
            className="st-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 16,
              animation: "st-riseIn .5s ease both",
              animationDelay: ".05s",
            }}
          >
            {limitBySize(stats, size, 2, 4).map((st) => (
              <div
                key={st.label}
                className="st-stat"
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 12,
                  boxShadow: "0 1px 2px rgba(2,8,23,.03)",
                  padding: 18,
                  transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.muted }}>{st.label}</p>
                <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 900, color: theme.brandInk, lineHeight: 1 }}>
                  {st.value}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 12.5, color: theme.faint }}>{st.sub}</p>
              </div>
            ))}
          </div>
        </>
      )
    },
    {
      id: "tracks-filters",
      render: () => (
        <>
          {/* TOOLBAR */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              animation: "st-riseIn .5s ease both",
              animationDelay: ".08s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 200, maxWidth: "100%", flexShrink: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    color: theme.faint,
                    pointerEvents: "none",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  className="st-search"
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 32px",
                    border: `1px solid ${theme.line}`,
                    borderRadius: 999,
                    background: theme.card,
                    fontSize: 13.5,
                    color: theme.ink,
                    transition: "border-color .15s",
                  }}
                  placeholder="Buscar módulo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search.trim().length > 0 ? (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Limpar busca"
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: theme.chip,
                      border: "none",
                      borderRadius: "50%",
                      color: theme.muted,
                      fontSize: 14,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flex: 1 }}>
                {categories.map((c) => {
                  const active = category === c;
                  const count = c === "Todas" ? allTracks.length : allTracks.filter((t) => t.area === c).length;
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
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
                        background: active ? theme.fill : theme.card,
                        color: active ? "#fff" : theme.ink2,
                        border: active ? `1px solid ${theme.fill}` : `1px solid ${theme.line}`,
                      }}
                    >
                      {c}
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
                          color: active ? "#fff" : theme.muted,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: theme.faint, fontWeight: 500 }}>
              Mostrando{" "}
              <b style={{ fontWeight: 800, color: theme.muted }}>
                {visibleTotal} de {allTracks.length}
              </b>{" "}
              módulos
            </p>
          </div>
        </>
      )
    },
    {
      id: "tracks-active",
      render: (size) => (
        <>
          {/* EM ANDAMENTO */}
          {visEnrolled.length > 0 ? (
            <div style={{ animation: "st-riseIn .5s ease both", animationDelay: ".1s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.ink }}>Em Andamento</h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 24,
                    height: 22,
                    padding: "0 7px",
                    borderRadius: 999,
                    background: theme.brandSoft,
                    color: theme.brandInk,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {visEnrolled.length}
                </span>
              </div>
              <div className="st-cards" style={cardsGrid}>
                {limitBySize(visEnrolled, size, 1, 2).map((t) => {
                  const pct = t.progressPercent;
                  const label = pct === 0 ? "Começar Módulo" : pct >= 100 ? "Revisar Módulo" : "Continuar Estudando";
                  return (
                    <div key={t.id} className="st-card" style={cardStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                        <TrackGlyph icon={t.coverIcon} title={t.title} />
                        <h3 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: theme.ink }}>
                          {t.title}
                        </h3>
                        <span style={categoryBadgeStyle}>{t.area}</span>
                      </div>
                      <p style={{ margin: "16px 0 18px", fontSize: 13.5, lineHeight: 1.6, color: theme.muted, flex: 1 }}>
                        {t.description}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 7,
                        }}
                      >
                        <span style={{ fontWeight: 600, color: theme.ink2 }}>
                          {t.completedMissions}/{t.totalMissions} missões concluídas
                        </span>
                        <span style={{ fontWeight: 700, color: theme.brandInk }}>{pct}%</span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          background: theme.line,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginBottom: 18,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 999,
                            background: theme.fill,
                            width: mounted ? `${pct}%` : "0%",
                            transition: "width .9s cubic-bezier(.22,1,.36,1)",
                          }}
                        />
                      </div>
                      <Link
                        href={`/app/trilhas/${t.slug}`}
                        className="st-cta-primary"
                        style={{
                          ...ctaBaseStyle,
                          background: theme.fill,
                          color: "#fff",
                          border: "none",
                          boxShadow: "0 2px 6px rgba(76,29,149,.22)",
                        }}
                      >
                        {label} <span style={{ fontSize: 15 }}>→</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )
    },
    {
      id: "tracks-available",
      render: (size) => (
        <>
          {/* PARA COMEÇAR DEPOIS */}
          {visAvailable.length > 0 ? (
            <div style={{ animation: "st-riseIn .5s ease both", animationDelay: ".12s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: theme.ink }}>Para Começar Depois:</h2>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 24,
                    height: 22,
                    padding: "0 7px",
                    borderRadius: 999,
                    background: theme.chip,
                    color: theme.ink2,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {visAvailable.length}
                </span>
              </div>
              <div className="st-cards" style={cardsGrid}>
                {limitBySize(visAvailable, size, 1, 2).map((t) => (
                  <div key={t.id} className="st-card" style={cardStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                      <TrackGlyph icon={t.coverIcon} title={t.title} />
                      <h3 style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: theme.ink }}>
                        {t.title}
                      </h3>
                      <span style={categoryBadgeStyle}>{t.area}</span>
                    </div>
                    <p style={{ margin: "16px 0 18px", fontSize: 13.5, lineHeight: 1.6, color: theme.muted, flex: 1 }}>
                      {t.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          background: "#fffbeb",
                          color: "#b45309",
                          border: "1px solid #fde68a",
                          borderRadius: 6,
                          padding: "6px 11px",
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #f59e0b" }} />
                        {t.totalMissions} missões guiadas
                      </span>
                    </div>
                    <form action={startTrackAction}>
                      <input type="hidden" name="trackId" value={t.id} />
                      <button
                        type="submit"
                        className="st-cta-ghost"
                        style={{
                          ...ctaBaseStyle,
                          width: "100%",
                          background: theme.card,
                          color: theme.brandInk,
                          border: `1px solid ${theme.brandMid}`,
                        }}
                      >
                        Adicionar à Minha Jornada <span style={{ fontSize: 15 }}>+</span>
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {/* NO RESULTS */}
          {noResults ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                background: theme.card,
                border: `1px dashed ${theme.line2}`,
                borderRadius: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink2 }}>Nenhum Módulo Encontrado</p>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.faint }}>
                Ajuste a busca ou troque a categoria selecionada.
              </p>
            </div>
          ) : null}
        </>
      )
    }
  ];

  return (
    <div className="student-tracks" style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <style>{`
        .student-tracks .st-stat:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(2,8,23,.06); border-color: ${theme.brandLine2}; }
        .student-tracks .st-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(2,8,23,.08); border-color: ${theme.brandLine2}; }
        .student-tracks .st-search:focus { border-color: ${theme.fill}; }
        .student-tracks .st-cta-primary:hover { filter: brightness(.97); }
        .student-tracks .st-cta-ghost:hover { background: ${theme.brandSoft}; }
        @keyframes st-riseIn { from { transform: translateY(14px); } to { transform: none; } }
        @media (max-width: 900px) { .student-tracks .st-stats { grid-template-columns: repeat(2,1fr) !important; } .student-tracks .st-cards { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .student-tracks .st-stats { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { .student-tracks * { animation: none !important; transition: none !important; } }
      `}</style>

      <LayoutCanvas
        page="trilhas"
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
