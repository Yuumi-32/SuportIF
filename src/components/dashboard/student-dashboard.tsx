"use client";

import Link from "next/link";
import { useState } from "react";

import { GuidedExerciseCard, type GuidedExercise } from "@/components/dashboard/guided-exercise";
import { LayoutCanvas, type CanvasBlock } from "@/components/layout/layout-canvas";
import type { BlockSize, DashboardLayoutItem } from "@/lib/appearance/layout";
import { useRevealProgress } from "@/lib/motion/reveal";
import { theme as c } from "@/lib/appearance/palette";

export type DashboardMission = {
  id: string;
  title: string;
  completed: boolean;
  xpReward: number;
};

export type DashboardModule = {
  id: string;
  title: string;
  order: number;
  completedMissions: number;
  totalMissions: number;
  missions: DashboardMission[];
};

export type DashboardTrack = {
  id: string;
  slug: string;
  title: string;
  description: string;
  completedMissions: number;
  totalMissions: number;
  progressPercent: number;
};

export type DashboardReview = {
  id: string;
  missionId: string;
  title: string;
  trackLabel: string;
  dueText: string;
  overdue: boolean;
};

export type DashboardBadge = { id: string; title: string; subtitle: string };

export type DashboardWeakSkill = { name: string; accuracy: number };

type StudentDashboardProps = {
  name: string;
  totalXp: number;
  level: number;
  progressPercent: number;
  completedMissions: number;
  totalMissions: number;
  pendingReviewCount: number;
  nextStep: {
    missionId: string;
    title: string;
    contextLabel: string;
    shortDescription: string;
    guidedPrompt: string;
    guidedExercise: GuidedExercise | null;
  } | null;
  badges: DashboardBadge[];
  focusTrack: { title: string; slug: string; modules: DashboardModule[] } | null;
  tracks: DashboardTrack[];
  recommendedSimulation: { id: string; title: string; description: string; typeLabel: string } | null;
  lastAttempt: { score: number; correctCount: number; wrongCount: number; title: string } | null;
  weakSkills: DashboardWeakSkill[];
  reviews: DashboardReview[];
  layout: DashboardLayoutItem[];
  freeLayout: boolean;
  startEditing: boolean;
};

const XP_PER_LEVEL = 250;


const panel: React.CSSProperties = {
  background: c.card,
  border: `1px solid ${c.line}`,
  borderRadius: 8,
  boxShadow: "0 1px 2px hsl(var(--slate-950) / 0.03)",
  padding: 22
};

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  background: c.brandSoft,
  color: c.brandInk,
  borderRadius: 6,
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 700
};

const ctaStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 40,
  padding: "0 16px",
  background: c.fill,
  color: c.onFill,
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 13.5,
  textDecoration: "none",
  transition: "all .18s"
};

const ghostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  height: 38,
  padding: "0 14px",
  background: c.card,
  color: c.brandInk,
  border: `1px solid ${c.brandLine2}`,
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 13,
  textDecoration: "none",
  transition: "all .18s"
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: c.ink, lineHeight: 1.25 }}>
      {children}
    </h2>
  );
}

function Rule() {
  return <div style={{ margin: "8px 0 0", height: 2, width: 48, background: c.fill, borderRadius: 999 }} />;
}

/**
 * A largura já chega animada pelo tween do bloco (quadro a quadro), por isso
 * não há `transition` aqui: as duas animações juntas arrastariam a barra.
 */
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ height: 10, background: c.line, borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          borderRadius: 999,
          background: c.fill,
          width: `${percent}%`
        }}
      />
    </div>
  );
}

export function StudentDashboard(props: StudentDashboardProps) {
  const {
    name,
    totalXp,
    level,
    progressPercent,
    completedMissions,
    totalMissions,
    pendingReviewCount,
    nextStep,
    badges,
    focusTrack,
    tracks,
    recommendedSimulation,
    lastAttempt,
    weakSkills,
    reviews,
    layout,
    freeLayout,
    startEditing
  } = props;

  const modules = focusTrack?.modules ?? [];
  const firstUnfinished = modules.findIndex((m) => m.completedMissions < m.totalMissions);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    modules[firstUnfinished >= 0 ? firstUnfinished : 0]?.id ?? null
  );
  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? modules[0] ?? null;

  // Cada bloco conta os próprios números quando entra na tela — chegar rolando
  // e ver o valor subir explica melhor o avanço do que um número já parado.
  const heroAnim = useRevealProgress<HTMLDivElement>(1100);
  const statsAnim = useRevealProgress<HTMLDivElement>(1200);
  const mapAnim = useRevealProgress<HTMLDivElement>(1000);
  const tracksAnim = useRevealProgress<HTMLDivElement>(1200);
  const simAnim = useRevealProgress<HTMLDivElement>(1200);

  // Anel do nível: progresso dentro do nível atual (250 XP por nível).
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const ringC = 2 * Math.PI * 34;
  const ringOffset = ringC * (1 - (xpInLevel / XP_PER_LEVEL) * heroAnim.value);
  const heroXp = Math.round(totalXp * heroAnim.value);

  const stats = [
    {
      title: "XP acumulado",
      value: String(Math.round(totalXp * statsAnim.value)),
      desc: "Seu avanço acumulado."
    },
    {
      title: "Nível atual",
      value: String(Math.round(level * statsAnim.value)),
      desc: "Você está neste nível."
    },
    {
      title: "Progresso geral",
      value: `${Math.round(progressPercent * statsAnim.value)}%`,
      desc: `${completedMissions}/${totalMissions} missões concluídas.`
    },
    {
      title: "Revisões ativas",
      value: String(Math.round(pendingReviewCount * statsAnim.value)),
      desc: "Para revisar hoje ou em breve."
    }
  ];

  const moduleDoneCount = modules.filter((m) => m.totalMissions > 0 && m.completedMissions >= m.totalMissions).length;
  const fillWidth =
    modules.length > 1 ? `${(moduleDoneCount / (modules.length - 1)) * 100 * mapAnim.value}%` : "0%";

  function renderHero(size: BlockSize) {
    return (
      <div
        ref={heroAnim.ref}
        style={{
          ...panel,
          border: `1px solid ${c.brandLine}`,
          padding: size === "P" ? 20 : 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 28,
          flexWrap: "wrap"
        }}
      >
        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {size !== "P" ? (
              <span style={{ ...chipStyle, background: c.chip, color: c.ink2, fontWeight: 600 }}>
                ÁREA DO ALUNO
              </span>
            ) : null}
            <span style={{ ...chipStyle, background: c.fill, color: c.onFill }}>★ {heroXp} XP</span>
            <span style={chipStyle}>Nível {level}</span>
          </div>
          <h1
            style={{
              margin: "14px 0 0",
              fontSize: size === "P" ? 22 : 30,
              fontWeight: 900,
              lineHeight: 1.14,
              color: c.ink
            }}
          >
            Olá, {name}!
          </h1>
          {size !== "P" ? (
            <p style={{ margin: "10px 0 0", maxWidth: "46ch", fontSize: 15, lineHeight: 1.6, color: c.ink2 }}>
              Continue sua jornada e priorize hoje os pontos que merecem atenção.
            </p>
          ) : null}
          <Link
            href={nextStep ? `/app/missoes/${nextStep.missionId}` : "/app/trilhas"}
            className="d-cta"
            style={{ ...ctaStyle, marginTop: 18, letterSpacing: ".03em" }}
          >
            {nextStep ? "CONTINUAR DE ONDE PAREI" : "ESCOLHER UMA TRILHA"} <span style={{ fontSize: 16 }}>→</span>
          </Link>
        </div>

        {size === "G" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", width: 130, height: 130 }}>
              <svg width="130" height="130" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke={c.brandSoft} strokeWidth="7" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke={c.fill}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={ringC.toFixed(1)}
                  strokeDashoffset={ringOffset.toFixed(1)}
                  transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dashoffset .1s linear" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <span style={{ fontSize: 12, color: c.muted, fontWeight: 600 }}>NÍVEL</span>
                <span style={{ fontSize: 34, fontWeight: 900, color: c.brandInk, lineHeight: 1 }}>{level}</span>
              </div>
            </div>
            <span style={{ fontSize: 12.5, color: c.muted, fontWeight: 600, textAlign: "center" }}>
              {xpInLevel}/{XP_PER_LEVEL} XP para o nível {level + 1}
            </span>
          </div>
        ) : null}
      </div>
    );
  }

  function renderNextStep(size: BlockSize) {
    return (
      <div style={{ ...panel, border: `1px solid ${c.brandMid}`, display: "flex", flexDirection: "column" }}>
        <span style={chipStyle}>HOJE</span>
        <h2 style={{ margin: "12px 0 0", fontSize: 19, fontWeight: 700, color: c.ink }}>Seu Próximo Passo:</h2>

        {nextStep ? (
          <>
            {size !== "P" ? (
              <>
                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: c.brandInk,
                    textTransform: "uppercase",
                    letterSpacing: ".04em"
                  }}
                >
                  {nextStep.contextLabel}
                </p>
                <Rule />
              </>
            ) : null}
            <h3 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 700, color: c.ink }}>{nextStep.title}</h3>
            {size !== "P" ? (
              <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.6, color: c.ink2 }}>
                {nextStep.shortDescription}
              </p>
            ) : null}

            {size === "G" && nextStep.guidedExercise ? (
              // A chave zera o feedback quando a missão avança e o exercício
              // do cartão passa a ser outro.
              <GuidedExerciseCard key={nextStep.guidedExercise.id} exercise={nextStep.guidedExercise} />
            ) : size === "G" && nextStep.guidedPrompt ? (
              <div
                style={{
                  marginTop: 18,
                  background: c.brandTint,
                  border: `1px solid ${c.brandLine}`,
                  borderRadius: 8,
                  padding: 16
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: c.brandInk,
                    textTransform: "uppercase",
                    letterSpacing: ".03em"
                  }}
                >
                  Exercício guiado
                </p>
                <p style={{ margin: "8px 0 0", fontSize: 14.5, fontWeight: 700, color: c.ink, lineHeight: 1.5 }}>
                  {nextStep.guidedPrompt}
                </p>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: c.muted }}>
                  Abra a missão para responder e registrar seu progresso.
                </p>
              </div>
            ) : null}

            <Link
              href={`/app/missoes/${nextStep.missionId}`}
              className="d-cta"
              style={{ ...ctaStyle, marginTop: 18, alignSelf: "flex-start" }}
            >
              Continuar estudando <span style={{ fontSize: 16 }}>→</span>
            </Link>
          </>
        ) : (
          <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.6, color: c.ink2 }}>
            Escolha uma trilha para abrir seu caminho de estudo e receber uma próxima missão.
          </p>
        )}
      </div>
    );
  }

  function renderBadges(size: BlockSize) {
    const visible = size === "P" ? [] : badges.slice(0, size === "M" ? 3 : badges.length);

    return (
      <div style={{ ...panel, border: `1px solid ${c.brandLine}`, display: "flex", flexDirection: "column" }}>
        <span style={chipStyle}>CONQUISTAS RECENTES</span>

        {size === "P" ? (
          <>
            <p style={{ margin: "14px 0 0", fontSize: 34, fontWeight: 900, color: c.brandInk, lineHeight: 1 }}>
              {badges.length}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: c.muted }}>
              {badges.length === 1 ? "conquista desbloqueada" : "conquistas desbloqueadas"}
            </p>
          </>
        ) : (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.map((b) => (
              <div
                key={b.id}
                className="d-badge"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  border: `1px solid ${c.line}`,
                  borderRadius: 8,
                  background: c.card,
                  transition: "all .18s"
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: c.brandSoft,
                    color: c.brandInk,
                    fontSize: 16,
                    flexShrink: 0
                  }}
                >
                  ★
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.ink }}>{b.title}</p>
                  {size === "G" ? (
                    <p style={{ margin: "1px 0 0", fontSize: 12.5, color: c.muted }}>{b.subtitle}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {size === "G" ? (
          <p style={{ margin: "14px 0 0", fontSize: 13, color: c.faint, lineHeight: 1.5 }}>
            {badges.length > 0
              ? "Avance nas missões para desbloquear novas conquistas."
              : "Suas próximas conquistas aparecem aqui conforme você avança."}
          </p>
        ) : null}
      </div>
    );
  }

  function renderStats(size: BlockSize) {
    const visible = size === "P" ? stats.slice(0, 2) : stats;

    return (
      <div
        ref={statsAnim.ref}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${size === "G" ? 190 : 140}px, 1fr))`,
          gap: 14
        }}
      >
        {visible.map((st) => (
          <div key={st.title} className="d-stat" style={{ ...panel, padding: 18, transition: "all .2s" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.muted }}>{st.title}</p>
            <p style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 900, color: c.brandInk, lineHeight: 1 }}>
              {st.value}
            </p>
            {size === "G" ? (
              <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.45, color: c.faint }}>{st.desc}</p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  function renderTrackMap(size: BlockSize) {
    if (!focusTrack || modules.length === 0) {
      return (
        <div style={panel}>
          <span style={chipStyle}>SUA TRILHA EM FOCO</span>
          <p style={{ margin: "14px 0 0", fontSize: 14, color: c.ink2 }}>
            Comece uma trilha para acompanhar seu mapa de módulos aqui.
          </p>
        </div>
      );
    }

    return (
      <div ref={mapAnim.ref} style={panel}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span style={{ ...chipStyle, border: `1px solid ${c.brandLine2}` }}>SUA TRILHA EM FOCO</span>
            <h2 style={{ margin: "10px 0 0", fontSize: 21, fontWeight: 800, color: c.ink }}>{focusTrack.title}</h2>
            <Rule />
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: c.muted }}>
              {size === "P"
                ? `${moduleDoneCount}/${modules.length} módulos concluídos.`
                : "Toque em um módulo para ver as missões:"}
            </p>
          </div>
          {size === "G" ? (
            <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 12, color: c.muted, fontWeight: 600, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: c.fill }} />
                Concluído
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: c.card, border: `2px solid ${c.fill}` }} />
                Atual
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: c.chip, border: `1px solid ${c.line2}` }} />
                Bloqueado
              </span>
            </div>
          ) : null}
        </div>

        {size === "P" ? (
          <div style={{ marginTop: 16 }}>
            <ProgressBar percent={Math.round((moduleDoneCount / modules.length) * 100 * mapAnim.value)} />
            <Link href={`/app/trilhas/${focusTrack.slug}`} className="d-ghost" style={{ ...ghostStyle, marginTop: 14 }}>
              Abrir trilha
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: 22, overflowX: "auto", padding: "4px 2px 6px" }}>
            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", minWidth: 460 }}>
              <div style={{ position: "absolute", left: 24, right: 24, top: 23, height: 4, background: c.line, borderRadius: 2 }} />
              <div
                style={{
                  position: "absolute",
                  left: 24,
                  top: 23,
                  height: 4,
                  background: c.fill,
                  borderRadius: 2,
                  width: fillWidth
                }}
              />
              {modules.map((mod, i) => {
                const done = mod.totalMissions > 0 && mod.completedMissions >= mod.totalMissions;
                const unlocked =
                  i === 0 ||
                  modules.slice(0, i).every((m) => m.totalMissions > 0 && m.completedMissions >= m.totalMissions);
                const isSelected = mod.id === selectedModule?.id;
                // Módulo atual: destravado mas ainda não concluído. Pulsa para
                // dizer onde a jornada está parada — sem competir com o anel de
                // seleção quando os dois caem no mesmo nó.
                const isCurrent = unlocked && !done;

                return (
                  <button
                    key={mod.id}
                    onClick={() => setSelectedModuleId(mod.id)}
                    style={{
                      position: "relative",
                      zIndex: 1,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 9,
                      width: 100,
                      padding: 0
                    }}
                  >
                    <span
                      className={isCurrent && !isSelected ? "d-pulse" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        fontSize: 15,
                        fontWeight: 800,
                        background: done ? c.fill : unlocked ? c.card : c.chip,
                        color: done ? c.onFill : unlocked ? c.brandInk : c.faint,
                        border: done || unlocked ? `3px solid ${c.fill}` : `1px solid ${c.line2}`,
                        boxShadow: isSelected ? `0 0 0 4px ${c.brandSoft}` : "none",
                        transition: "all .2s"
                      }}
                    >
                      {done ? "✓" : mod.order}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 800 : 600,
                        color: isSelected ? c.brandInk : unlocked ? c.ink2 : c.faint,
                        textAlign: "center",
                        lineHeight: 1.3
                      }}
                    >
                      {mod.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {size === "G" && selectedModule ? (
          <div style={{ marginTop: 20, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 8, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <span
                  style={{
                    ...chipStyle,
                    background: selectedModule.completedMissions >= selectedModule.totalMissions ? c.fill : c.brandSoft,
                    color: selectedModule.completedMissions >= selectedModule.totalMissions ? c.onFill : c.brandInk
                  }}
                >
                  {selectedModule.completedMissions}/{selectedModule.totalMissions} missões
                </span>
                <h3 style={{ margin: "10px 0 0", fontSize: 17, fontWeight: 700, color: c.ink }}>
                  {selectedModule.title}
                </h3>
              </div>
              <Link href={`/app/modulos/${selectedModule.id}`} className="d-cta" style={{ ...ctaStyle, height: 38 }}>
                Abrir módulo <span>→</span>
              </Link>
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedModule.missions.map((m, i) => {
                // A primeira pendente é a que a pessoa deve abrir agora.
                const isNext =
                  !m.completed && selectedModule.missions.slice(0, i).every((prev) => prev.completed);

                return (
                  <Link
                    key={m.id}
                    href={`/app/missoes/${m.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      background: c.card,
                      border: `1px solid ${isNext ? c.brandLine2 : c.line}`,
                      borderRadius: 8,
                      textDecoration: "none"
                    }}
                  >
                    <span
                      className={isNext ? "d-pulse" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        flexShrink: 0,
                        fontSize: 13,
                        fontWeight: 800,
                        background: m.completed ? c.fill : c.brandSoft,
                        color: m.completed ? c.onFill : c.brandInk
                      }}
                    >
                      {m.completed ? "✓" : "▸"}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: isNext ? 700 : 600,
                        color: m.completed ? c.muted : isNext ? c.brandInk : c.ink
                      }}
                    >
                      {m.title}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.faint }}>{m.xpReward} XP</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderTracks(size: BlockSize) {
    const visible = tracks.slice(0, size === "P" ? 1 : size === "M" ? 2 : 3);

    return (
      <div ref={tracksAnim.ref}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <SectionTitle>Trilhas em Andamento</SectionTitle>
          <Link
            href="/app/trilhas"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: c.faint, textDecoration: "none" }}
          >
            VER TODAS &gt;
          </Link>
        </div>

        {visible.length === 0 ? (
          <div style={{ ...panel, borderStyle: "dashed", textAlign: "center", color: c.muted, fontSize: 14 }}>
            Você ainda não começou nenhuma trilha.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {visible.map((t) => {
              const shownPercent = Math.round(t.progressPercent * tracksAnim.value);

              return (
                <div key={t.id} className="d-track" style={{ ...panel, display: "flex", flexDirection: "column", transition: "all .2s" }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: c.ink }}>{t.title}</h3>
                  {size === "G" ? (
                    <p style={{ margin: "8px 0 16px", fontSize: 13.5, lineHeight: 1.55, color: c.muted, flex: 1 }}>
                      {t.description}
                    </p>
                  ) : (
                    <div style={{ flex: 1, minHeight: 12 }} />
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600, color: c.ink2 }}>
                      {t.completedMissions}/{t.totalMissions} missões
                    </span>
                    <span style={{ fontWeight: 700, color: c.brandInk }}>{shownPercent}%</span>
                  </div>
                  <ProgressBar percent={shownPercent} />
                  {size !== "P" ? (
                    <Link href={`/app/trilhas/${t.slug}`} className="d-ghost" style={{ ...ghostStyle, marginTop: 14 }}>
                      Continuar estudando
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderSimulation(size: BlockSize) {
    return (
      <div ref={simAnim.ref} style={{ ...panel, border: `1px solid ${c.brandMid}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ maxWidth: "60ch" }}>
            <span style={chipStyle}>PARA PRATICAR</span>
            <h2 style={{ margin: "10px 0 0", fontSize: 19, fontWeight: 700, color: c.ink }}>
              Próximo Simulado Sugerido
            </h2>
            {size !== "P" ? (
              <>
                <Rule />
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: c.muted }}>
                  Pratique com resultado salvo e revise os pontos que aparecerem como dificuldade.
                </p>
              </>
            ) : null}
          </div>
          <Link href="/app/simulados" className="d-ghost" style={ghostStyle}>
            Ver simulados
          </Link>
        </div>

        {size !== "P" ? (
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: size === "G" ? "repeat(auto-fit, minmax(260px, 1fr))" : "1fr",
              gap: 16
            }}
          >
            <div
              style={{
                background: c.brandSoft,
                border: `1px solid ${c.brandLine2}`,
                borderRadius: 8,
                padding: 16,
                display: "flex",
                flexDirection: "column"
              }}
            >
              {recommendedSimulation ? (
                <>
                  <span style={{ ...chipStyle, background: c.card, color: c.brandInk }}>
                    {recommendedSimulation.typeLabel}
                  </span>
                  <h3 style={{ margin: "12px 0 0", fontSize: 17, fontWeight: 700, color: c.brandInk }}>
                    {recommendedSimulation.title}
                  </h3>
                  <p style={{ margin: "8px 0 16px", fontSize: 13.5, lineHeight: 1.55, color: c.brandInk, flex: 1 }}>
                    {recommendedSimulation.description}
                  </p>
                  <Link
                    href={`/app/simulados/${recommendedSimulation.id}`}
                    className="d-cta"
                    style={{ ...ctaStyle, alignSelf: "flex-start" }}
                  >
                    Iniciar prática <span style={{ fontSize: 16 }}>→</span>
                  </Link>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13.5, color: c.brandInk }}>Novos simulados aparecerão aqui.</p>
              )}
            </div>

            {size === "G" ? (
              <div style={{ background: c.card, border: `1px solid ${c.line}`, borderRadius: 8, padding: 16 }}>
                {lastAttempt ? (
                  <>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.muted }}>Último Resultado:</p>
                    <p style={{ margin: "4px 0 0", fontSize: 40, fontWeight: 900, color: c.ink, lineHeight: 1 }}>
                      {Math.round(lastAttempt.score * simAnim.value)}
                      <span style={{ fontSize: 22 }}>%</span>
                    </p>
                    <p style={{ margin: "4px 0 14px", fontSize: 13, color: c.muted }}>
                      {lastAttempt.title} ·{" "}
                      <b style={{ fontWeight: 800 }}>
                        {lastAttempt.correctCount} acertos e {lastAttempt.wrongCount} erros
                      </b>
                      .
                    </p>
                    {weakSkills.length > 0 ? (
                      <>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: c.warn }}>
                          Pontos a Reforçar:
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                          {weakSkills.slice(0, 3).map((w, i) => {
                            const shownAccuracy = Math.round(w.accuracy * simAnim.value);

                            return (
                              <div key={i}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                                  <span style={{ color: c.ink2, fontWeight: 600 }}>{w.name}</span>
                                  <span style={{ color: c.warn, fontWeight: 700 }}>{shownAccuracy}%</span>
                                </div>
                                <div style={{ height: 7, background: c.warnSoft, borderRadius: 999, overflow: "hidden" }}>
                                  <div
                                    style={{
                                      height: "100%",
                                      borderRadius: 999,
                                      background: c.warnFill,
                                      width: `${shownAccuracy}%`
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: c.muted }}>
                        Nenhum ponto crítico apareceu no último simulado.
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: c.muted }}>
                    Faça seu primeiro simulado para ver pontos fortes e fracos aqui.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderReviews(size: BlockSize) {
    const visible = size === "P" ? [] : reviews.slice(0, size === "M" ? 3 : reviews.length);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <SectionTitle>Revisões que Merecem sua Atenção:</SectionTitle>
          <Link href="/app/revisoes" style={{ fontSize: 13, fontWeight: 600, color: c.brandInk, textDecoration: "none" }}>
            VER TODAS &gt;
          </Link>
        </div>

        {size === "P" ? (
          <div style={panel}>
            <p style={{ margin: 0, fontSize: 34, fontWeight: 900, color: c.brandInk, lineHeight: 1 }}>
              {pendingReviewCount}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: c.muted }}>
              {pendingReviewCount === 1 ? "revisão aguardando" : "revisões aguardando"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visible.length > 0 ? (
              visible.map((r) => (
                <div
                  key={r.id}
                  className={r.overdue ? "d-rev d-rev-urgent" : "d-rev"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 15px",
                    background: c.card,
                    border: `1px solid ${r.overdue ? "#fcd9b6" : c.line}`,
                    borderRadius: 10,
                    boxShadow: "0 1px 2px hsl(var(--slate-950) / 0.03)",
                    transition: "all .18s",
                    flexWrap: "wrap"
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 38,
                      height: 38,
                      borderRadius: 8,
                      background: c.brandSoft,
                      color: c.brandInk,
                      fontSize: 18,
                      flexShrink: 0
                    }}
                  >
                    ↻
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: c.ink }}>{r.title}</p>
                    {size === "G" ? (
                      <p style={{ margin: "2px 0 0", fontSize: 12.5, color: c.muted }}>{r.trackLabel}</p>
                    ) : null}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: r.overdue ? "#fff7ed" : c.chip,
                      color: r.overdue ? "#9a5b1d" : c.ink2,
                      flexShrink: 0
                    }}
                  >
                    {r.dueText}
                  </span>
                  <Link href={`/app/missoes/${r.missionId}`} className="d-ghost" style={{ ...ghostStyle, height: 34 }}>
                    Revisar
                  </Link>
                </div>
              ))
            ) : (
              <div
                style={{
                  background: c.card,
                  border: `1px dashed ${c.line2}`,
                  borderRadius: 10,
                  padding: "26px 20px",
                  textAlign: "center"
                }}
              >
                <p style={{ margin: 0, fontSize: 14, color: c.muted }}>Não há revisões pendentes no momento.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const blocks: CanvasBlock[] = [
    { id: "hero", render: renderHero },
    { id: "next-step", render: renderNextStep },
    { id: "badges", render: renderBadges },
    { id: "stats", render: renderStats },
    { id: "track-map", render: renderTrackMap },
    { id: "tracks", render: renderTracks },
    { id: "simulation", render: renderSimulation },
    { id: "reviews", render: renderReviews }
  ];

  return (
    <div className="dash">
      <style>{`
        .dash .d-cta:hover { background: ${c.fillDark}; transform: translateY(-1px); }
        .dash .d-stat:hover { transform: translateY(-3px); box-shadow: 0 10px 24px hsl(var(--slate-950) / .07); border-color: ${c.brandMid}; }
        .dash .d-track:hover { transform: translateY(-3px); box-shadow: 0 12px 26px hsl(var(--slate-950) / .08); border-color: ${c.brandMid}; }
        .dash .d-badge:hover { border-color: ${c.brandMid}; background: ${c.brandTint}; transform: translateX(2px); }
        .dash .d-rev:hover { border-color: ${c.brandMid}; transform: translateX(3px); }
        .dash .d-ghost:hover { background: ${c.brandSoft}; border-color: ${c.fill}; }
        .dash .d-pulse { animation: d-pulse-ring 2.2s ease-out infinite; }
        .dash .d-rev-urgent { animation: d-rev-pulse 2.6s ease-in-out infinite; }
        @keyframes d-pulse-ring {
          0% { box-shadow: 0 0 0 0 hsl(var(--violet-800) / .38); }
          70% { box-shadow: 0 0 0 9px hsl(var(--violet-800) / 0); }
          100% { box-shadow: 0 0 0 0 hsl(var(--violet-800) / 0); }
        }
        @keyframes d-rev-pulse {
          0%, 100% { box-shadow: 0 1px 2px hsl(var(--slate-950) / .03); }
          50% { box-shadow: 0 0 0 4px hsl(var(--violet-800) / .10), 0 4px 14px hsl(var(--violet-800) / .10); }
        }
        @media (prefers-reduced-motion: reduce) { .dash * { animation: none !important; transition: none !important; } }
      `}</style>

      <LayoutCanvas
        page="inicio"
        blocks={blocks}
        layout={layout}
        freeLayout={freeLayout}
        startEditing={startEditing}
      />
    </div>
  );
}
