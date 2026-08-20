"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { startTrackAction } from "@/server/actions/student";
import { theme } from "@/lib/appearance/palette";

type Mission = {
  id: string;
  title: string;
  shortDescription: string;
  completed: boolean;
  exerciseCount: number;
  correctCount: number;
  attemptsCount: number;
};

type ModuleSummary = {
  id: string;
  title: string;
  description: string;
  order: number;
  completedMissions: number;
  totalMissions: number;
  progressPercent: number;
  missions: Mission[];
};

type TrackSummary = {
  id: string;
  title: string;
  description: string;
  area: string;
  isDemo: boolean;
  totalMissions: number;
  completedMissions: number;
  modules: ModuleSummary[];
};

type TrackDetailProps = {
  enrolled: boolean;
  summary: TrackSummary;
};

type Filter = "all" | "progress" | "done";

type FirstAvailable = { missionId: string; moduleId: string; title: string; moduleTitle: string };

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

export function TrackDetail({ enrolled, summary }: TrackDetailProps) {
  const modules = summary.modules;

  // Locking derived from completion: a module unlocks when every previous
  // module is fully done; a mission becomes available when its module is
  // unlocked and every earlier mission in it is complete.
  const { moduleDone, moduleUnlocked, firstAvailable } = useMemo<{
    moduleDone: boolean[];
    moduleUnlocked: boolean[];
    firstAvailable: FirstAvailable | null;
  }>(() => {
    const done = modules.map((m) => m.missions.length > 0 && m.missions.every((ms) => ms.completed));
    const unlocked = modules.map((_, i) => i === 0 || done.slice(0, i).every(Boolean));

    let firstAvail: FirstAvailable | null = null;
    modules.forEach((m, i) => {
      if (!unlocked[i]) return;
      m.missions.forEach((ms, j) => {
        const prevDone = m.missions.slice(0, j).every((x) => x.completed);
        if (!firstAvail && prevDone && !ms.completed) {
          firstAvail = { missionId: ms.id, moduleId: m.id, title: ms.title, moduleTitle: m.title };
        }
      });
    });

    return { moduleDone: done, moduleUnlocked: unlocked, firstAvailable: firstAvail };
  }, [modules]);

  const [filter, setFilter] = useState<Filter>("all");
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const initialId = firstAvailable?.moduleId ?? modules[0]?.id;
    return initialId ? { [initialId]: true } : {};
  });
  const [openMission, setOpenMission] = useState<string | null>(null);
  const [displayPct, setDisplayPct] = useState(0);

  const targetPct = summary.totalMissions > 0 ? (100 * summary.completedMissions) / summary.totalMissions : 0;

  // Animate the progress ring from 0 to its real value on mount.
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplayPct(targetPct);
      return;
    }
    const start = performance.now();
    const duration = 700;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplayPct(targetPct * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [targetPct]);

  function toggleModule(id: string) {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function togglePreview(id: string) {
    setOpenMission((prev) => (prev === id ? null : id));
  }

  function openRecommended() {
    if (!firstAvailable) return;
    setFilter("all");
    setOpenModules((prev) => ({ ...prev, [firstAvailable.moduleId]: true }));
    setOpenMission(firstAvailable.missionId);
    requestAnimationFrame(() => {
      document
        .getElementById(`mission-${firstAvailable.missionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const ringOffset = RING_CIRCUMFERENCE * (1 - displayPct / 100);

  // Filter counts.
  let progressCount = 0;
  modules.forEach((m, i) => {
    if (moduleUnlocked[i] && !moduleDone[i]) {
      progressCount += m.missions.filter((ms) => !ms.completed).length;
    }
  });

  const filterTabs: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: "Tudo", count: summary.totalMissions },
    { key: "progress", label: "Em andamento", count: progressCount },
    { key: "done", label: "Concluídas", count: summary.completedMissions },
  ];

  // Build the visible module/mission views with the current filter applied.
  let visibleCount = 0;
  const moduleViews = modules.map((m, i) => {
    const unlocked = moduleUnlocked[i];
    const isDone = moduleDone[i];
    const state: "done" | "current" | "locked" = isDone ? "done" : unlocked ? "current" : "locked";

    const missionViews = m.missions.map((ms, j) => {
      const prevDone = m.missions.slice(0, j).every((x) => x.completed);
      const available = unlocked && prevDone && !ms.completed;
      const locked = !ms.completed && !available;
      const status: "completed" | "available" | "locked" = ms.completed ? "completed" : available ? "available" : "locked";
      return { mission: ms, status, locked, unlocked };
    });

    let visible = missionViews;
    if (filter === "done") visible = missionViews.filter((v) => v.status === "completed");
    else if (filter === "progress")
      visible = missionViews.filter((v) => unlocked && !isDone && v.status !== "completed");

    const show = filter === "all" ? true : visible.length > 0;
    const open = filter === "all" ? !!openModules[m.id] : true;
    if (show) visibleCount += visible.length;

    return { module: m, state, visible, show, open };
  });

  return (
    <div className="track-detail" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <style>{`
        .track-detail .td-back { transition: color .15s; }
        .track-detail .td-back:hover { color: ${theme.brandInk}; }
        .track-detail .td-rec-btn:hover { background: ${theme.fillDark}; transform: translateY(-1px); }
        .track-detail .td-mcard:hover { border-color: ${theme.brandLine2} !important; box-shadow: 0 4px 14px rgba(2,8,23,.05); }
        .track-detail .td-cta:hover { background: ${theme.fillDark}; }
        .track-detail .td-complete-cta:hover { border-color: ${theme.faint}; }
        @keyframes td-riseIn { from { transform: translateY(14px); } to { transform: none; } }
        @keyframes td-pulseRing { 0% { box-shadow: 0 0 0 0 rgba(91,33,182,.4); } 70% { box-shadow: 0 0 0 8px rgba(91,33,182,0); } 100% { box-shadow: 0 0 0 0 rgba(91,33,182,0); } }
        @media (max-width: 860px) { .track-detail .td-head-grid { grid-template-columns: 1fr !important; } }
        @media (prefers-reduced-motion: reduce) { .track-detail * { animation: none !important; transition: none !important; } }
      `}</style>

      <Link
        href="/app/trilhas"
        className="td-back"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          fontSize: 13.5,
          fontWeight: 600,
          color: theme.muted,
          textDecoration: "none",
          alignSelf: "flex-start",
        }}
      >
        <span style={{ fontSize: 16 }}>←</span> Meus Módulos
      </Link>

      {/* TRACK HEADER */}
      <div
        className="td-head-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 312px", gap: 20, animation: "td-riseIn .5s ease both" }}
      >
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: theme.brandSoft,
                color: theme.brandInk,
                borderRadius: 6,
                padding: "4px 11px",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              {summary.area}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: theme.card,
                color: theme.ink2,
                border: `1px solid ${theme.line}`,
                borderRadius: 6,
                padding: "4px 11px",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {summary.isDemo ? "Trilha demonstrativa" : "Trilha disponível"}
            </span>
          </div>
          <h1 style={{ margin: "14px 0 0", fontSize: 32, fontWeight: 900, lineHeight: 1.12, color: theme.ink }}>
            {summary.title}
          </h1>
          <p style={{ margin: "10px 0 0", maxWidth: "60ch", fontSize: 15.5, lineHeight: 1.6, color: theme.ink2 }}>
            {summary.description}
          </p>
          <div style={{ margin: "12px 0 0", height: 2, width: 48, background: theme.fill, borderRadius: 999 }} />
        </div>

        <div
          style={{
            background: theme.card,
            border: `1px solid ${theme.brandLine2}`,
            borderRadius: 8,
            boxShadow: "0 6px 22px rgba(76,29,149,.05)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, alignSelf: "flex-start", fontSize: 12.5, fontWeight: 700, color: theme.muted }}>
            Progresso da trilha
          </p>
          <div style={{ position: "relative", width: 124, height: 124, margin: "10px 0 2px" }}>
            <svg width="124" height="124" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" stroke={theme.brandSoft} strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r={RING_RADIUS}
                fill="none"
                stroke={theme.brandInk}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE.toFixed(1)}
                strokeDashoffset={ringOffset.toFixed(1)}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 34, fontWeight: 900, color: theme.brandInk, lineHeight: 1 }}>
                {Math.round(displayPct)}
                <span style={{ fontSize: 18 }}>%</span>
              </span>
              <span style={{ fontSize: 11.5, color: theme.faint, fontWeight: 600 }}>concluído</span>
            </div>
          </div>
          <p style={{ margin: "8px 0 12px", fontSize: 13, color: theme.ink2, fontWeight: 600 }}>
            {summary.completedMissions} de {summary.totalMissions} missões concluídas
          </p>
          {enrolled ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: theme.fill,
                color: "#fff",
                borderRadius: 999,
                padding: "5px 13px",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              ✓ Na sua jornada
            </span>
          ) : (
            <form action={startTrackAction}>
              <input type="hidden" name="trackId" value={summary.id} />
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 40,
                  padding: "0 16px",
                  background: theme.fill,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(76,29,149,.25)",
                }}
              >
                Iniciar jornada
              </button>
            </form>
          )}
        </div>
      </div>

      {/* RECOMMENDED */}
      {firstAvailable ? (
        <div
          style={{
            background: theme.brandSoft,
            border: `1px solid ${theme.brandLine2}`,
            borderRadius: 8,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            animation: "td-riseIn .5s ease both",
            animationDelay: ".05s",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                color: theme.brandInk,
              }}
            >
              ★ Próxima missão recomendada
            </p>
            <h2 style={{ margin: "7px 0 0", fontSize: 19, fontWeight: 800, color: theme.brandInk }}>
              {firstAvailable.title}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 13.5, color: theme.brandInk }}>
              Etapa do módulo {firstAvailable.moduleTitle}
            </p>
          </div>
          <button
            onClick={openRecommended}
            className="td-rec-btn"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 44,
              padding: "0 20px",
              background: theme.fill,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(76,29,149,.25)",
              transition: "all .18s",
            }}
          >
            Continuar estudando <span style={{ fontSize: 16 }}>→</span>
          </button>
        </div>
      ) : null}

      {/* FILTER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
          animation: "td-riseIn .5s ease both",
          animationDelay: ".08s",
        }}
      >
        <div style={{ display: "inline-flex", background: theme.chip, borderRadius: 9, padding: 4, gap: 3 }}>
          {filterTabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  height: 36,
                  padding: "0 14px",
                  border: "none",
                  borderRadius: 7,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .18s",
                  background: active ? theme.card : "transparent",
                  color: active ? theme.brandInk : theme.muted,
                  boxShadow: active ? "0 1px 3px rgba(2,8,23,.1)" : "none",
                }}
              >
                {tab.label}
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
                    background: active ? theme.brandSoft : theme.line,
                    color: active ? theme.brandInk : theme.muted,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: theme.faint, fontWeight: 500 }}>
          Mostrando {visibleCount} de {summary.totalMissions} missões
        </p>
      </div>

      {/* MODULES */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {moduleViews.map(({ module, state, visible, show, open }, i) => {
          if (!show) return null;

          const stepStyle: React.CSSProperties = {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "50%",
            fontWeight: 800,
            fontSize: 16,
            flexShrink: 0,
            transition: "all .3s ease",
            ...(state === "done"
              ? { background: theme.fill, border: `3px solid ${theme.fill}`, color: "#fff" }
              : state === "current"
                ? {
                    background: theme.card,
                    border: `3px solid ${theme.fill}`,
                    color: theme.brandInk,
                    animation: "td-pulseRing 2.4s ease-out infinite",
                  }
                : { background: theme.chip, border: `3px solid ${theme.line}`, color: theme.faint }),
          };

          const eyebrowColor = state === "locked" ? theme.faint : theme.brandInk;
          const eyebrow = state === "locked" ? `Etapa ${module.order} · Bloqueado` : `Etapa ${module.order}`;
          const badgeStyle: React.CSSProperties = {
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 12,
            fontWeight: 700,
            transition: "all .3s ease",
            ...(state === "done"
              ? { background: theme.fill, color: "#fff" }
              : state === "current"
                ? { background: theme.brandSoft, color: theme.brandInk }
                : { background: theme.chip, color: theme.faint }),
          };

          return (
            <div key={module.id} style={{ animation: "td-riseIn .5s ease both", animationDelay: `${i * 45}ms` }}>
              <div
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 10,
                  boxShadow: "0 1px 2px rgba(2,8,23,.03)",
                  transition: "opacity .3s ease, border-color .2s ease",
                  opacity: state === "locked" ? 0.82 : 1,
                }}
              >
                <button
                  onClick={() => toggleModule(module.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                  }}
                >
                  <span style={stepStyle}>{state === "done" ? "✓" : module.order}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: ".06em",
                        textTransform: "uppercase",
                        color: eyebrowColor,
                      }}
                    >
                      {eyebrow}
                    </p>
                    <h3 style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 700, color: theme.ink }}>
                      {module.title}
                    </h3>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 13.5,
                        color: theme.muted,
                        lineHeight: 1.5,
                        maxWidth: "62ch",
                      }}
                    >
                      {module.description}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    <span style={badgeStyle}>
                      {module.completedMissions}/{module.totalMissions} missões
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: theme.faint,
                        transition: "transform .25s ease",
                        transform: open ? "rotate(180deg)" : "none",
                      }}
                    >
                      ⌄
                    </span>
                  </div>
                </button>

                <div style={{ padding: "0 20px 16px", marginTop: -2 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: theme.faint, fontWeight: 600 }}>Progresso do módulo</span>
                    <span style={{ color: theme.brandInk, fontWeight: 700 }}>{module.progressPercent}%</span>
                  </div>
                  <div style={{ height: 8, background: theme.line, borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        background: theme.fill,
                        width: `${module.progressPercent}%`,
                        transition: "width .7s cubic-bezier(.22,1,.36,1)",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    overflow: "hidden",
                    transition: "max-height .4s ease, opacity .3s ease",
                    maxHeight: open ? 4000 : 0,
                    opacity: open ? 1 : 0,
                  }}
                >
                  <div style={{ padding: "2px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {visible.map(({ mission, status, locked, unlocked }) => {
                      const previewOpen = openMission === mission.id;

                      const iconStyle: React.CSSProperties = {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        flexShrink: 0,
                        fontSize: 15,
                        fontWeight: 800,
                        transition: "all .25s ease",
                        ...(status === "completed"
                          ? { background: theme.fill, border: `2px solid ${theme.fill}`, color: "#fff" }
                          : status === "available"
                            ? {
                                background: theme.card,
                                border: `2px solid ${theme.fill}`,
                                color: theme.brandInk,
                                animation: "td-pulseRing 2.4s ease-out infinite",
                              }
                            : { background: theme.chip, border: `2px solid ${theme.line}`, color: theme.faint }),
                      };

                      const badgeText =
                        status === "completed" ? "Concluída" : status === "available" ? "Disponível" : "Bloqueada";
                      const statusBadgeStyle: React.CSSProperties = {
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 6,
                        padding: "2px 9px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        ...(status === "completed"
                          ? { background: theme.fill, color: "#fff" }
                          : status === "available"
                            ? { background: theme.brandSoft, color: theme.brandInk }
                            : { background: theme.chip, color: theme.faint }),
                      };

                      const metaText =
                        status === "completed"
                          ? `${mission.correctCount}/${mission.exerciseCount} acertos únicos · ${mission.attemptsCount} ${mission.attemptsCount === 1 ? "tentativa" : "tentativas"}`
                          : status === "available"
                            ? `${mission.exerciseCount} exercícios guiados · comece quando quiser`
                            : !unlocked
                              ? "Conclua o módulo anterior para liberar"
                              : "Conclua a missão anterior para liberar";

                      const lockReason = !unlocked
                        ? "Este módulo abre quando você concluir o módulo anterior."
                        : "Conclua a missão anterior para liberar esta.";

                      const cardBg =
                        status === "completed" ? theme.brandTint : status === "available" ? theme.card : theme.card;
                      const cardBd =
                        status === "completed" ? theme.brandLine2 : status === "available" ? theme.brandLine2 : theme.line;

                      return (
                        <div
                          key={mission.id}
                          id={`mission-${mission.id}`}
                          className="td-mcard"
                          style={{
                            border: `1.5px solid ${cardBd}`,
                            background: cardBg,
                            borderRadius: 9,
                            transition: "border-color .25s ease, background .25s ease, box-shadow .2s ease",
                          }}
                        >
                          <button
                            onClick={() => togglePreview(mission.id)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "14px 16px",
                              display: "flex",
                              alignItems: "center",
                              gap: 13,
                            }}
                          >
                            <span style={iconStyle}>
                              {status === "completed" ? (
                                "✓"
                              ) : status === "available" ? (
                                "▸"
                              ) : (
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="4" y="11" width="16" height="9" rx="2" />
                                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                </svg>
                              )}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 14.5,
                                    fontWeight: 700,
                                    color: status === "locked" ? theme.faint : theme.ink,
                                  }}
                                >
                                  {mission.title}
                                </p>
                                <span style={statusBadgeStyle}>{badgeText}</span>
                              </div>
                              <p style={{ margin: "3px 0 0", fontSize: 12.5, color: theme.faint }}>{metaText}</p>
                            </div>
                            <span
                              style={{
                                fontSize: 14,
                                color: theme.line2,
                                transition: "transform .25s ease",
                                flexShrink: 0,
                                transform: previewOpen ? "rotate(180deg)" : "none",
                              }}
                            >
                              ⌄
                            </span>
                          </button>

                          <div
                            style={{
                              overflow: "hidden",
                              transition: "max-height .35s ease, opacity .3s ease",
                              maxHeight: previewOpen ? 360 : 0,
                              opacity: previewOpen ? 1 : 0,
                            }}
                          >
                            <div style={{ padding: "0 16px 16px 47px" }}>
                              <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6, color: theme.ink2 }}>
                                {mission.shortDescription}
                              </p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    background: theme.chip,
                                    color: theme.ink2,
                                    borderRadius: 6,
                                    padding: "4px 10px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {mission.exerciseCount} exercícios
                                </span>
                                {status === "completed" ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      background: theme.brandSoft,
                                      color: theme.brandInk,
                                      borderRadius: 6,
                                      padding: "4px 10px",
                                      fontSize: 12,
                                      fontWeight: 700,
                                    }}
                                  >
                                    ✓ {mission.correctCount}/{mission.exerciseCount} acertos
                                  </span>
                                ) : null}
                              </div>

                              {locked ? (
                                <p
                                  style={{
                                    margin: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.faint,
                                  }}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect x="4" y="11" width="16" height="9" rx="2" />
                                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                  </svg>
                                  {lockReason}
                                </p>
                              ) : (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                                  <Link
                                    href={`/app/missoes/${mission.id}`}
                                    className="td-cta"
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 7,
                                      height: 38,
                                      padding: "0 16px",
                                      background: theme.fill,
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: 6,
                                      fontWeight: 600,
                                      fontSize: 13.5,
                                      cursor: "pointer",
                                      boxShadow: "0 2px 6px rgba(76,29,149,.22)",
                                      transition: "all .18s",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {status === "completed" ? "Revisar missão" : "Estudar missão"}{" "}
                                    <span style={{ fontSize: 15 }}>→</span>
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: 12.5, color: theme.faint }}>
        Conteúdo demonstrativo, fictício e não oficial.
      </p>
    </div>
  );
}
