"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { theme } from "@/lib/appearance/palette";
import { appearancePresets } from "@/lib/appearance/settings";
import {
  formatTeacherName,
  getLogTone,
  getLogToneLabel,
  rolePermissions,
  type AdminActionResult
} from "@/lib/admin/presentation";
import type { AdminActivityDay, AdminOverview } from "@/server/queries/admin";
import {
  createClassGroupAction,
  saveInstitutionSettingsAction,
  setModuleApprovalAction,
  setUserSuspensionAction
} from "@/server/actions/admin";

type Tab = "saude" | "usuarios" | "permissoes" | "conteudo" | "turmas" | "auditoria" | "config";
type Period = "7d" | "30d" | "sem";
type RoleFilter = "todos" | "STUDENT" | "TEACHER" | "ADMIN";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "saude", label: "Saúde da Plataforma" },
  { key: "usuarios", label: "Usuários" },
  { key: "permissoes", label: "Permissões" },
  { key: "conteudo", label: "Conteúdo" },
  { key: "turmas", label: "Turmas" },
  { key: "auditoria", label: "Auditoria" },
  { key: "config", label: "Configurações" }
];

const periods: Array<{ key: Period; label: string; days: number }> = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "sem", label: "Semestre", days: 180 }
];

/// Tons das etiquetas. O trio pílula (fundo, borda, texto) é claro e fixo dos
/// dois lados do tema; `ink` é a mesma família quando a cor vira texto direto
/// sobre o cartão e precisa acompanhar o tema.
type Tone = { bg: string; border: string; color: string; ink: string };

const tones = {
  brand: { bg: theme.brandSoft, border: theme.brandLine2, color: theme.brandInk, ink: theme.brandInk },
  blue: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8", ink: theme.todayInk },
  amber: { bg: theme.warnSoft, border: "#fde68a", color: theme.warn, ink: theme.warnInk },
  green: { bg: theme.okSoft, border: "#bbf7d0", color: theme.ok, ink: theme.okInk },
  red: { bg: theme.dangerSoft, border: "#fecaca", color: theme.danger, ink: theme.dangerInk },
  slate: { bg: theme.chip, border: theme.line, color: theme.ink2, ink: theme.ink2 }
} satisfies Record<string, Tone>;

const roleMeta: Record<string, { label: string; tone: Tone }> = {
  STUDENT: { label: "Aluno", tone: tones.brand },
  TEACHER: { label: "Professor", tone: tones.blue },
  ADMIN: { label: "Admin", tone: tones.amber }
};

const logTones = {
  content: tones.brand,
  class: tones.blue,
  account: tones.amber,
  config: tones.slate,
  platform: tones.green
} as const;

const levelMeta = {
  TECHNICAL: { label: "Técnico", tone: tones.brand },
  HIGHER: { label: "Superior", tone: tones.blue }
};

const contentMeta = {
  PENDING: { label: "Pendente", tone: tones.amber },
  APPROVED: { label: "Aprovado", tone: tones.green },
  REJECTED: { label: "Rejeitado", tone: tones.red }
};

const crudLinks = [
  { href: "/admin/trilhas", title: "Trilhas", description: "Áreas, nível, visibilidade e módulos." },
  { href: "/admin/modulos", title: "Módulos", description: "Organize os módulos dentro das trilhas." },
  { href: "/admin/missoes", title: "Missões", description: "Conteúdo em camadas e XP." },
  { href: "/admin/exercicios", title: "Exercícios", description: "Questões e alternativas." },
  { href: "/admin/simulados", title: "Simulados", description: "Provas montadas com exercícios reais." },
  { href: "/admin/badges", title: "Badges", description: "Conquistas da plataforma." }
];

/** Milhar com ponto, sem depender do ICU — servidor e navegador escrevem igual. */
function formatNumber(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "2026-08-20" → "20/08", sem passar por Date para não escorregar de fuso. */
function shortDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

/** Número com a palavra no singular ou plural — "1 professor", "5 alunos". */
function plural(value: number, one: string, many: string) {
  return `${formatNumber(value)} ${value === 1 ? one : many}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

type Bar = { key: string; label: string; value: number; tip: string };

/**
 * Agrupa os dias do período em no máximo `target` barras.
 *
 * Sete dias viram sete barras com o nome do dia; um semestre vira blocos de
 * quinze dias — o gráfico mantém a mesma largura em qualquer filtro.
 */
function buildBars(days: AdminActivityDay[], target = 14): Bar[] {
  const size = Math.max(1, Math.ceil(days.length / target));
  const bars: Bar[] = [];

  for (let index = 0; index < days.length; index += size) {
    const slice = days.slice(index, index + size);
    const value = slice.reduce((total, day) => total + day.events, 0);
    const first = slice[0];
    const last = slice[slice.length - 1];

    bars.push({
      key: first.date,
      label: size === 1 ? first.label : shortDate(first.date),
      value,
      tip:
        size === 1
          ? `${shortDate(first.date)}: ${formatNumber(value)} registros`
          : `${shortDate(first.date)} a ${shortDate(last.date)}: ${formatNumber(value)} registros`
    });
  }

  return bars;
}

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifySelf: "start",
        borderRadius: 6,
        padding: "3px 9px",
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color
      }}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className,
  style
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: theme.card,
        border: `1px solid ${theme.line}`,
        borderRadius: 12,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.ink }}>{title}</h2>
      {description ? (
        <p style={{ margin: "6px 0 0", fontSize: 14, color: theme.muted }}>{description}</p>
      ) : null}
    </div>
  );
}

function ColumnLabel({ children, align }: { children: React.ReactNode; align?: "right" | "center" }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        color: theme.muted,
        textAlign: align
      }}
    >
      {children}
    </span>
  );
}

function Bars({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, background: theme.chip, borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          borderRadius: 999,
          background: color,
          width: `${Math.max(0, Math.min(100, pct))}%`,
          transition: "width .7s cubic-bezier(.22,1,.36,1)"
        }}
      />
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "0 15px",
  background: theme.fill,
  border: "none",
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: 700,
  color: theme.onFill,
  cursor: "pointer",
  transition: "background .15s"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 13px",
  background: theme.card,
  border: `1px solid ${theme.line}`,
  borderRadius: 8,
  fontSize: 14,
  color: theme.ink,
  outline: "none"
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 700,
  color: theme.ink2,
  marginBottom: 7
};

export function AdminPanel({ overview, adminId, adminName }: { overview: AdminOverview; adminId: string; adminName: string }) {
  const [tab, setTab] = useState<Tab>("saude");
  const [period, setPeriod] = useState<Period>("30d");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [feedback, setFeedback] = useState<AdminActionResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: "",
    course: "",
    term: "",
    level: "TECHNICAL",
    teacherId: overview.teachers[0]?.id ?? ""
  });
  const [config, setConfig] = useState(overview.institution);

  /** Toda ação do painel volta com um aviso; é ele que confirma o que gravou. */
  function run(id: string, action: () => Promise<AdminActionResult>) {
    setBusyId(id);
    startTransition(async () => {
      const result = await action();
      setFeedback(result);
      setBusyId(null);
    });
  }

  const periodDef = periods.find((item) => item.key === period) ?? periods[1];
  const windowDays = overview.activity.slice(-periodDef.days);
  const previousDays = overview.activity.slice(-periodDef.days * 2, -periodDef.days);
  const bars = useMemo(() => buildBars(windowDays), [windowDays]);
  const maxBar = Math.max(1, ...bars.map((bar) => bar.value));
  const peakBar = bars.reduce((best, bar) => (bar.value > best.value ? bar : best), bars[0]);
  const periodEvents = windowDays.reduce((total, day) => total + day.events, 0);
  const previousEvents = previousDays.reduce((total, day) => total + day.events, 0);
  // Só compara com o período anterior quando os dois lados têm registro: sem
  // isso, uma base recém-criada mostraria "-100%" sem ter tido queda nenhuma.
  const trend =
    previousDays.length === periodDef.days && previousEvents > 0 && periodEvents > 0
      ? Math.round(((periodEvents - previousEvents) / previousEvents) * 100)
      : null;

  const activeInPeriod = overview.activeUsers[period];
  const activePercent = overview.totals.users ? Math.round((activeInPeriod / overview.totals.users) * 100) : 0;
  const studentsInClasses = overview.classes.reduce((total, item) => total + item.students, 0);

  const kpis = [
    {
      key: "contas",
      label: "Contas Cadastradas",
      value: formatNumber(overview.totals.users),
      pct: 100,
      color: theme.fill,
      ink: theme.brandInk,
      hint: `${plural(overview.totals.students, "aluno", "alunos")} · ${plural(
        overview.totals.teachers,
        "professor",
        "professores"
      )}`
    },
    {
      key: "ativos",
      label: "Ativos no Período",
      value: formatNumber(activeInPeriod),
      pct: activePercent,
      color: theme.ok,
      ink: theme.okInk,
      hint: `${activePercent}% das contas cadastradas`
    },
    {
      key: "fila",
      label: "Aguardando Aprovação",
      value: formatNumber(overview.pendingContent),
      pct: overview.totals.modules ? (overview.pendingContent / overview.totals.modules) * 100 : 0,
      color: theme.warnFill,
      ink: theme.warnInk,
      hint: "Módulos ainda não publicados"
    },
    {
      key: "turmas",
      label: "Turmas Ativas",
      value: formatNumber(overview.totals.classes),
      pct: overview.totals.classes ? 100 : 0,
      color: theme.fill,
      ink: theme.brandInk,
      hint: `${plural(studentsInClasses, "aluno vinculado", "alunos vinculados")}`
    }
  ];

  const distribution = [
    { key: "alunos", label: "Alunos", value: overview.totals.students, color: theme.fill },
    { key: "professores", label: "Professores", value: overview.totals.teachers, color: theme.brandMid },
    { key: "admins", label: "Administradores", value: overview.totals.admins, color: theme.warnFill }
  ];

  const platformStatus = [
    {
      key: "suspensas",
      label: "Contas suspensas",
      value: overview.platform.suspended,
      tone: overview.platform.suspended > 0 ? tones.amber : tones.green
    },
    {
      key: "revisoes",
      label: "Revisões atrasadas",
      value: overview.platform.overdueReviews,
      tone: overview.platform.overdueReviews > 0 ? tones.amber : tones.green
    },
    {
      key: "risco",
      label: "Alunos em risco",
      value: overview.platform.riskSignals,
      tone: overview.platform.riskSignals > 0 ? tones.red : tones.green
    }
  ];

  const query = search.trim().toLowerCase();
  const filteredUsers = overview.users.filter(
    (user) =>
      (roleFilter === "todos" || user.role === roleFilter) &&
      (!query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query))
  );

  /** Relatório do que está na tela, no separador que o Excel pt-BR entende. */
  function exportReport() {
    const lines = [
      ["SuportIF — relatório da plataforma"],
      ["Instituição", overview.institution.name],
      ["Período", periodDef.label],
      [],
      ["Indicador", "Valor"],
      ...kpis.map((kpi) => [kpi.label, kpi.value]),
      ["Registros de atividade no período", String(periodEvents)],
      ["Contas suspensas", String(overview.platform.suspended)],
      ["Revisões atrasadas", String(overview.platform.overdueReviews)],
      [],
      ["Turma", "Curso", "Período", "Professor", "Alunos", "Progresso médio"],
      ...overview.classes.map((item) => [
        item.name,
        item.course,
        item.term,
        item.teachers,
        String(item.students),
        `${item.progressPercent}%`
      ])
    ];

    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `suportif-plataforma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback({ ok: true, message: "Relatório da plataforma exportado em CSV." });
  }

  function submitClass() {
    run("nova-turma", async () => {
      const result = await createClassGroupAction(classForm);

      if (result.ok) {
        setClassFormOpen(false);
        setClassForm({
          name: "",
          course: "",
          term: "",
          level: "TECHNICAL",
          teacherId: overview.teachers[0]?.id ?? ""
        });
      }

      return result;
    });
  }

  return (
    <div className="adm" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <style>{`
        .adm .adm-primary:hover { background: ${theme.fillDark}; }
        .adm .adm-ghost:hover { background: ${theme.surface}; }
        .adm .adm-kpi:hover { border-color: ${theme.brandLine2}; box-shadow: 0 4px 16px ${theme.shadow}; }
        .adm .adm-row:hover { background: ${theme.surface}; }
        .adm .adm-link:hover { border-color: ${theme.brandLine2}; background: ${theme.brandTint}; }
        .adm .adm-input:focus { border-color: ${theme.fill}; }
        .adm .adm-scroll { overflow-x: auto; }
        @keyframes adm-rise { from { transform: translateY(14px); } to { transform: none; } }
        @keyframes adm-fade { from { transform: translateY(-4px); } to { transform: none; } }
        @media (max-width: 1000px) {
          .adm .adm-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .adm .adm-health { grid-template-columns: 1fr !important; }
          .adm .adm-config { grid-template-columns: 1fr !important; }
          .adm .adm-form-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .adm .adm-kpis { grid-template-columns: 1fr !important; }
          .adm .adm-crud { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { .adm * { animation: none !important; transition: none !important; } }
      `}</style>

      {/* CABEÇALHO */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          animation: "adm-rise .5s ease both"
        }}
      >
        <div>
          <Pill tone={tones.brand}>PAINEL DO ADMIN</Pill>
          <h1 style={{ margin: "12px 0 0", fontSize: 29, fontWeight: 800, letterSpacing: "-.02em", color: theme.ink }}>
            Olá, {adminName.split(" ")[0]}!
          </h1>
          <p style={{ margin: "9px 0 0", maxWidth: "64ch", fontSize: 15.5, lineHeight: 1.6, color: theme.ink2 }}>
            Acompanhe a saúde da plataforma, gerencie contas e turmas e aprove o conteúdo antes de ele chegar
            às turmas.
          </p>
          <div style={{ margin: "12px 0 0", height: 2, width: 48, background: theme.fill, borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {periods.map((item) => {
            const active = item.key === period;
            return (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key)}
                className="adm-ghost"
                style={{
                  height: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s",
                  background: active ? theme.fill : theme.card,
                  border: `1px solid ${active ? theme.fill : theme.line}`,
                  color: active ? theme.onFill : theme.ink2
                }}
              >
                {item.label}
              </button>
            );
          })}
          <button onClick={exportReport} className="adm-primary" style={primaryButton}>
            Exportar Relatório
          </button>
        </div>
      </div>

      {/* AVISO DA ÚLTIMA AÇÃO */}
      {feedback ? (
        <div
          role="status"
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "11px 14px",
            borderRadius: 9,
            fontSize: 13.5,
            fontWeight: 600,
            animation: "adm-fade .28s ease both",
            background: feedback.ok ? theme.brandSoft : theme.dangerSoft,
            border: `1px solid ${feedback.ok ? theme.brandLine2 : "#fecaca"}`,
            color: feedback.ok ? theme.brandInk : theme.dangerInk
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* NÚMEROS DO TOPO */}
      <div
        className="adm-kpis"
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          animation: "adm-rise .5s ease both",
          animationDelay: ".05s"
        }}
      >
        {kpis.map((kpi) => (
          <Card key={kpi.key} className="adm-kpi" style={{ padding: "16px 18px", transition: "border-color .18s, box-shadow .18s" }}>
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: theme.faint
              }}
            >
              {kpi.label}
            </p>
            <p style={{ margin: "9px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", color: theme.ink }}>
              {kpi.value}
            </p>
            <div style={{ marginTop: 10 }}>
              <Bars pct={kpi.pct} color={kpi.color} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, fontWeight: 600, color: kpi.ink }}>{kpi.hint}</p>
          </Card>
        ))}
      </div>

      {/* ABAS */}
      <div
        className="adm-scroll"
        style={{
          marginTop: 28,
          display: "flex",
          gap: 2,
          borderBottom: `1px solid ${theme.line}`,
          animation: "adm-rise .5s ease both",
          animationDelay: ".08s"
        }}
      >
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={{
                height: 42,
                padding: "0 14px",
                background: "none",
                border: "none",
                borderBottom: `2.5px solid ${active ? theme.fill : "transparent"}`,
                fontSize: 14,
                fontWeight: active ? 700 : 600,
                color: active ? theme.brandInk : theme.muted,
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "all .15s",
                marginBottom: -1
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "saude" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <div className="adm-health" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.ink }}>Atividade por Dia</h2>
                  <p style={{ margin: "5px 0 0", fontSize: 13, color: theme.muted }}>
                    {periodEvents > 0
                      ? `Pico de ${formatNumber(peakBar?.value ?? 0)} registros em ${peakBar ? shortDate(peakBar.key) : "—"}`
                      : "Sem atividade registrada neste período"}
                  </p>
                </div>
                <Pill tone={trend !== null && trend < 0 ? tones.amber : tones.green}>
                  {trend !== null
                    ? `${trend >= 0 ? "+" : ""}${trend}% vs. período anterior`
                    : `${formatNumber(periodEvents)} registros`}
                </Pill>
              </div>
              <div style={{ marginTop: 22, display: "flex", alignItems: "flex-end", gap: 8, height: 150 }}>
                {bars.map((bar) => (
                  <div
                    key={bar.key}
                    title={bar.tip}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 7,
                      height: "100%"
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        borderRadius: "5px 5px 0 0",
                        background: bar.value === maxBar && bar.value > 0 ? theme.fill : theme.brandLine2,
                        // Barra vazia continua visível como risco fino: some só a
                        // altura, não o dia.
                        height: `${Math.max(2, (bar.value / maxBar) * 100)}%`,
                        transition: "height .7s cubic-bezier(.22,1,.36,1)"
                      }}
                    />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: theme.faint }}>{bar.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{ padding: "20px 22px" }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.ink }}>Distribuição de Contas</h2>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 15 }}>
                {distribution.map((item) => (
                  <div key={item.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink2 }}>{item.label}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.ink }}>{formatNumber(item.value)}</span>
                    </div>
                    <Bars
                      pct={overview.totals.users ? (item.value / overview.totals.users) * 100 : 0}
                      color={item.color}
                    />
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: `1px solid ${theme.line}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 11
                }}
              >
                {platformStatus.map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, color: theme.ink2 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.tone.ink, flexShrink: 0 }} />
                      {item.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: item.tone.ink }}>{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      ) : null}

      {tab === "usuarios" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap"
            }}
          >
            <SectionTitle title="Usuários da Plataforma" />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="adm-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                style={{
                  width: 250,
                  height: 38,
                  padding: "0 14px",
                  border: `1px solid ${theme.line}`,
                  borderRadius: 999,
                  background: theme.card,
                  fontSize: 13.5,
                  color: theme.ink,
                  outline: "none",
                  transition: "border-color .15s"
                }}
              />
              {([
                ["todos", "Todos"],
                ["STUDENT", "Alunos"],
                ["TEACHER", "Professores"],
                ["ADMIN", "Admins"]
              ] as Array<[RoleFilter, string]>).map(([key, label]) => {
                const active = roleFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setRoleFilter(key)}
                    className="adm-ghost"
                    style={{
                      height: 38,
                      padding: "0 14px",
                      borderRadius: 999,
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all .15s",
                      background: active ? theme.fill : theme.card,
                      border: `1px solid ${active ? theme.fill : theme.line}`,
                      color: active ? theme.onFill : theme.ink2
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Card style={{ overflow: "hidden" }}>
            <div className="adm-scroll">
              <div style={{ minWidth: 860 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2.1fr 1fr 1.1fr .9fr 118px",
                    gap: 24,
                    padding: "12px 18px",
                    background: theme.surface,
                    borderBottom: `1px solid ${theme.line}`
                  }}
                >
                  <ColumnLabel>Nome</ColumnLabel>
                  <ColumnLabel>E-mail</ColumnLabel>
                  <ColumnLabel>Papel</ColumnLabel>
                  <ColumnLabel>Último acesso</ColumnLabel>
                  <ColumnLabel>Status</ColumnLabel>
                  <ColumnLabel align="right">Ação</ColumnLabel>
                </div>

                {filteredUsers.map((user) => {
                  const meta = roleMeta[user.role];
                  const isSelf = user.id === adminId;
                  const busy = busyId === user.id && isPending;

                  return (
                    <div
                      key={user.id}
                      className="adm-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 2.1fr 1fr 1.1fr .9fr 118px",
                        gap: 24,
                        alignItems: "center",
                        padding: "13px 18px",
                        borderBottom: `1px solid ${theme.line}`,
                        transition: "background .14s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: theme.brandSoft,
                            color: theme.brandInk,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 12
                          }}
                        >
                          {initials(user.name)}
                        </span>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            color: theme.ink,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {user.name}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          color: theme.muted,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {user.email}
                      </span>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                      <span style={{ fontSize: 13, color: theme.ink2 }}>{user.lastAccess}</span>
                      <Pill tone={user.suspended ? tones.red : tones.green}>
                        {user.suspended ? "Suspenso" : "Ativo"}
                      </Pill>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          className="adm-ghost"
                          disabled={isSelf || busy}
                          title={isSelf ? "Você não pode suspender a própria conta." : undefined}
                          onClick={() => run(user.id, () => setUserSuspensionAction(user.id, !user.suspended))}
                          style={{
                            height: 32,
                            padding: "0 12px",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: isSelf ? "not-allowed" : "pointer",
                            opacity: isSelf ? 0.45 : 1,
                            transition: "all .15s",
                            background: user.suspended ? theme.fill : theme.card,
                            border: user.suspended ? "none" : `1px solid ${theme.line}`,
                            color: user.suspended ? theme.onFill : theme.ink2
                          }}
                        >
                          {busy ? "..." : user.suspended ? "Reativar" : "Suspender"}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredUsers.length === 0 ? (
                  <p style={{ margin: 0, padding: 28, textAlign: "center", fontSize: 14, color: theme.faint }}>
                    Nenhum usuário encontrado com esses filtros.
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: theme.muted }}>
            Mostrando{" "}
            <strong style={{ color: theme.ink }}>
              {filteredUsers.length} de {overview.userTotal}
            </strong>{" "}
            {overview.userTotal === 1 ? "conta" : "contas"}
            {overview.userTotal > overview.users.length ? " (as 200 primeiras em ordem alfabética)" : ""}
          </p>
        </section>
      ) : null}

      {tab === "permissoes" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <SectionTitle
            title="Permissões por Papel"
            description="O que cada papel já pode fazer hoje. Os papéis são fixos nesta fase: a tabela mostra a regra que as rotas aplicam, não um ajuste editável."
          />
          <Card style={{ marginTop: 16, overflow: "hidden" }}>
            <div className="adm-scroll">
              <div style={{ minWidth: 640 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.4fr repeat(3, 1fr)",
                    gap: 24,
                    padding: "13px 20px",
                    background: theme.surface,
                    borderBottom: `1px solid ${theme.line}`
                  }}
                >
                  <ColumnLabel>Permissão</ColumnLabel>
                  <ColumnLabel align="center">Aluno</ColumnLabel>
                  <ColumnLabel align="center">Professor</ColumnLabel>
                  <ColumnLabel align="center">Admin</ColumnLabel>
                </div>
                {rolePermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="adm-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.4fr repeat(3, 1fr)",
                      gap: 24,
                      alignItems: "center",
                      padding: "14px 20px",
                      borderBottom: `1px solid ${theme.line}`,
                      transition: "background .14s"
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.ink }}>{permission.label}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 12.5, color: theme.faint }}>{permission.description}</p>
                    </div>
                    {(["STUDENT", "TEACHER", "ADMIN"] as const).map((role) => {
                      const allowed = permission.roles[role];
                      return (
                        <div key={role} style={{ display: "flex", justifyContent: "center" }}>
                          <span
                            aria-label={allowed ? "Permitido" : "Não permitido"}
                            style={{
                              width: 26,
                              height: 26,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 7,
                              fontSize: 14,
                              fontWeight: 800,
                              background: allowed ? theme.fill : theme.card,
                              border: allowed ? `1.5px solid ${theme.fill}` : `1.5px solid ${theme.line2}`,
                              color: allowed ? theme.onFill : "transparent"
                            }}
                          >
                            ✓
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {tab === "conteudo" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap"
            }}
          >
            <SectionTitle
              title="Fila de Conteúdo"
              description="Módulos esperando aprovação e os últimos revisados. Só o aprovado aparece nas trilhas dos alunos."
            />
            <span style={{ fontSize: 13, color: theme.muted }}>
              <strong style={{ color: theme.ink }}>{overview.pendingContent}</strong> na fila
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {overview.content.map((item) => {
              const meta = contentMeta[item.status];
              const busy = busyId === item.id && isPending;

              return (
                <Card
                  key={item.id}
                  style={{ borderLeft: `3px solid ${meta.tone.ink}`, borderRadius: 11, padding: "16px 18px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 18,
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.ink }}>{item.title}</p>
                        <Pill tone={meta.tone}>{meta.label}</Pill>
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.muted }}>{item.meta}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <Link
                        href={`/admin/modulos?edit=${item.id}`}
                        className="adm-ghost"
                        style={{
                          height: 36,
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "0 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          background: theme.card,
                          border: `1px solid ${theme.line}`,
                          color: theme.ink2,
                          textDecoration: "none"
                        }}
                      >
                        Abrir
                      </Link>
                      <button
                        className="adm-ghost"
                        disabled={busy || item.status === "REJECTED"}
                        onClick={() => run(item.id, () => setModuleApprovalAction(item.id, "REJECTED"))}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: item.status === "REJECTED" ? "default" : "pointer",
                          transition: "all .15s",
                          background: item.status === "REJECTED" ? tones.red.bg : theme.card,
                          border: `1px solid ${item.status === "REJECTED" ? tones.red.border : theme.line}`,
                          color: item.status === "REJECTED" ? tones.red.color : theme.ink2
                        }}
                      >
                        {item.status === "REJECTED" ? "Rejeitado" : "Rejeitar"}
                      </button>
                      <button
                        className={item.status === "APPROVED" ? "adm-ghost" : "adm-primary"}
                        disabled={busy || item.status === "APPROVED"}
                        onClick={() => run(item.id, () => setModuleApprovalAction(item.id, "APPROVED"))}
                        style={{
                          height: 36,
                          padding: "0 15px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: item.status === "APPROVED" ? "default" : "pointer",
                          transition: "all .15s",
                          background: item.status === "APPROVED" ? tones.green.bg : theme.fill,
                          border: item.status === "APPROVED" ? `1px solid ${tones.green.border}` : "none",
                          color: item.status === "APPROVED" ? tones.green.color : theme.onFill
                        }}
                      >
                        {busy ? "..." : item.status === "APPROVED" ? "Aprovado" : "Aprovar"}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {overview.content.length === 0 ? (
              <Card style={{ padding: "48px 24px", textAlign: "center", borderStyle: "dashed" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.ink2 }}>Fila vazia</p>
                <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.faint }}>
                  Nenhum módulo esperando aprovação.
                </p>
              </Card>
            ) : null}
          </div>

          <div style={{ marginTop: 28 }}>
            <SectionTitle
              title="Gerenciar Conteúdo"
              description="Cada área abaixo lê e grava no banco. O conteúdo atual é demonstrativo e não oficial."
            />
            <div
              className="adm-crud"
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12
              }}
            >
              {crudLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="adm-link"
                  style={{
                    display: "block",
                    padding: "16px 18px",
                    borderRadius: 11,
                    background: theme.card,
                    border: `1px solid ${theme.line}`,
                    textDecoration: "none",
                    transition: "all .18s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: theme.ink }}>{item.title}</span>
                    <Pill tone={tones.slate}>CRUD</Pill>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, color: theme.muted }}>
                    {item.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "turmas" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap"
            }}
          >
            <SectionTitle title="Turmas e Períodos Letivos" />
            <button onClick={() => setClassFormOpen((open) => !open)} className="adm-primary" style={primaryButton}>
              {classFormOpen ? "Fechar" : "Criar Turma"}
            </button>
          </div>

          {classFormOpen ? (
            <Card style={{ border: `1px solid ${theme.brandLine2}`, padding: "20px 22px", marginBottom: 14, animation: "adm-fade .3s ease both" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: theme.ink }}>Nova Turma</h3>
              <div className="adm-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.9fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle} htmlFor="turma-nome">
                    Nome da turma
                  </label>
                  <input
                    id="turma-nome"
                    className="adm-input"
                    value={classForm.name}
                    onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
                    placeholder="Ex: 3º C ou ADS 1º"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="turma-curso">
                    Curso
                  </label>
                  <input
                    id="turma-curso"
                    className="adm-input"
                    value={classForm.course}
                    onChange={(event) => setClassForm({ ...classForm, course: event.target.value })}
                    placeholder="Ex: Ensino Médio Integrado — Informática"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="adm-form-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle} htmlFor="turma-prof">
                    Professor responsável
                  </label>
                  <select
                    id="turma-prof"
                    className="adm-input"
                    value={classForm.teacherId}
                    onChange={(event) => setClassForm({ ...classForm, teacherId: event.target.value })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {overview.teachers.length === 0 ? <option value="">Nenhum professor cadastrado</option> : null}
                    {overview.teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {formatTeacherName(teacher.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="turma-periodo">
                    Período
                  </label>
                  <input
                    id="turma-periodo"
                    className="adm-input"
                    value={classForm.term}
                    onChange={(event) => setClassForm({ ...classForm, term: event.target.value })}
                    placeholder="Ex: 2026.2"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="turma-nivel">
                    Nível
                  </label>
                  <select
                    id="turma-nivel"
                    className="adm-input"
                    value={classForm.level}
                    onChange={(event) => setClassForm({ ...classForm, level: event.target.value })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="TECHNICAL">Técnico</option>
                    <option value="HIGHER">Superior</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => setClassFormOpen(false)}
                  className="adm-ghost"
                  style={{
                    height: 42,
                    padding: "0 18px",
                    background: theme.card,
                    border: `1px solid ${theme.line}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.muted,
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={submitClass}
                  disabled={busyId === "nova-turma" && isPending}
                  className="adm-primary"
                  style={{ ...primaryButton, height: 42, borderRadius: 8, padding: "0 20px", fontSize: 14 }}
                >
                  {busyId === "nova-turma" && isPending ? "Criando..." : "Criar turma"}
                </button>
              </div>
            </Card>
          ) : null}

          <Card style={{ overflow: "hidden" }}>
            <div className="adm-scroll">
              <div style={{ minWidth: 820 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.9fr 1.4fr .8fr .9fr 1.3fr",
                    gap: 28,
                    padding: "12px 20px",
                    background: theme.surface,
                    borderBottom: `1px solid ${theme.line}`
                  }}
                >
                  <ColumnLabel>Turma</ColumnLabel>
                  <ColumnLabel>Professor</ColumnLabel>
                  <ColumnLabel>Período</ColumnLabel>
                  <ColumnLabel>Alunos</ColumnLabel>
                  <ColumnLabel>Progresso médio</ColumnLabel>
                </div>
                {overview.classes.map((item) => {
                  const level = levelMeta[item.level];
                  return (
                    <div
                      key={item.id}
                      className="adm-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.9fr 1.4fr .8fr .9fr 1.3fr",
                        gap: 28,
                        alignItems: "center",
                        padding: "14px 20px",
                        borderBottom: `1px solid ${theme.line}`,
                        transition: "background .14s"
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: theme.ink }}>{item.name}</span>
                          <Pill tone={level.tone}>{level.label}</Pill>
                        </div>
                        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: theme.faint }}>{item.course}</p>
                      </div>
                      <span style={{ fontSize: 13.5, color: theme.ink2 }}>{item.teachers}</span>
                      <span style={{ fontSize: 13, color: theme.muted }}>{item.term}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: theme.ink2 }}>
                        {item.students} {item.students === 1 ? "aluno" : "alunos"}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, maxWidth: 110 }}>
                          <Bars pct={item.progressPercent} color={theme.fill} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink2 }}>
                          {item.progressPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {overview.classes.length === 0 ? (
                  <p style={{ margin: 0, padding: 28, textAlign: "center", fontSize: 14, color: theme.faint }}>
                    Nenhuma turma cadastrada ainda.
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {tab === "auditoria" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <SectionTitle
            title="Registro de Atividade"
            description="As últimas ações gravadas na plataforma, de alunos a administradores."
          />
          <Card style={{ marginTop: 16, padding: "6px 20px" }}>
            {overview.logs.map((log) => {
              const tone = logTones[getLogTone(log.entityType)];
              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 0",
                    borderBottom: `1px solid ${theme.line}`
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      flexShrink: 0,
                      marginTop: 6,
                      borderRadius: "50%",
                      background: tone.ink
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, color: theme.ink }}>
                      <strong style={{ fontWeight: 700 }}>{log.actor}</strong> {log.action}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, color: theme.faint }}>{log.when}</p>
                  </div>
                  <Pill tone={tone}>{getLogToneLabel(log.entityType)}</Pill>
                </div>
              );
            })}
            {overview.logs.length === 0 ? (
              <p style={{ margin: 0, padding: 28, textAlign: "center", fontSize: 14, color: theme.faint }}>
                Nenhuma atividade registrada.
              </p>
            ) : null}
          </Card>
        </section>
      ) : null}

      {tab === "config" ? (
        <section style={{ marginTop: 22, animation: "adm-rise .45s ease both" }}>
          <SectionTitle
            title="Configurações da Instituição"
            description="Valem para a plataforma inteira: o nome aparece na tela de entrada, a cor é o tema de quem ainda não personalizou e o domínio é cobrado no cadastro."
          />
          <div className="adm-config" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card style={{ padding: "20px 22px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: theme.ink }}>Identidade</h3>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: theme.muted }}>Nome e cor exibidos aos alunos.</p>
              <label style={labelStyle} htmlFor="cfg-nome">
                Nome da instituição
              </label>
              <input
                id="cfg-nome"
                className="adm-input"
                value={config.name}
                onChange={(event) => setConfig({ ...config, name: event.target.value })}
                style={{ ...inputStyle, marginBottom: 16 }}
              />
              <span style={labelStyle}>Cor principal</span>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                {appearancePresets.map((preset) => {
                  const active = config.primaryColor === preset.id;
                  return (
                    <button
                      key={preset.id}
                      title={preset.label}
                      aria-label={preset.label}
                      onClick={() => setConfig({ ...config, primaryColor: preset.id })}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: preset.accent,
                        cursor: "pointer",
                        transition: "transform .15s",
                        transform: active ? "scale(1.08)" : "none",
                        border: active ? `2.5px solid ${theme.ink}` : `1px solid ${theme.line2}`
                      }}
                    />
                  );
                })}
              </div>
            </Card>

            <Card style={{ padding: "20px 22px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: theme.ink }}>Acesso</h3>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: theme.muted }}>Quem pode criar conta na plataforma.</p>
              <label style={labelStyle} htmlFor="cfg-dominio">
                Domínio de e-mail permitido
              </label>
              <input
                id="cfg-dominio"
                className="adm-input"
                value={config.emailDomain}
                onChange={(event) => setConfig({ ...config, emailDomain: event.target.value })}
                placeholder="@ifb.edu.br"
                style={{ ...inputStyle, marginBottom: 18 }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  {
                    key: "openRegistration" as const,
                    label: "Cadastro aberto",
                    description: "Permite criar conta pela tela de entrada",
                    value: config.openRegistration
                  },
                  {
                    key: "requireInstitutionalEmail" as const,
                    label: "Exigir e-mail institucional",
                    description: "Só aceita cadastro no domínio acima",
                    value: config.requireInstitutionalEmail
                  }
                ].map((item) => (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.ink }}>{item.label}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12.5, color: theme.faint }}>{item.description}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={item.value}
                      aria-label={item.label}
                      onClick={() => setConfig({ ...config, [item.key]: !item.value })}
                      style={{
                        width: 42,
                        height: 24,
                        flexShrink: 0,
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        padding: 3,
                        display: "flex",
                        justifyContent: item.value ? "flex-end" : "flex-start",
                        background: item.value ? theme.fill : theme.line2,
                        transition: "background .18s"
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "#fff",
                          display: "block",
                          boxShadow: "0 1px 3px rgba(0,0,0,.2)"
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => run("config", () => saveInstitutionSettingsAction(config))}
              disabled={busyId === "config" && isPending}
              className="adm-primary"
              style={primaryButton}
            >
              {busyId === "config" && isPending ? "Salvando..." : "Salvar configurações"}
            </button>
            <button
              onClick={() => setConfig(overview.institution)}
              className="adm-ghost"
              style={{
                height: 38,
                padding: "0 15px",
                borderRadius: 999,
                background: theme.card,
                border: `1px solid ${theme.line}`,
                fontSize: 13.5,
                fontWeight: 600,
                color: theme.ink2,
                cursor: "pointer"
              }}
            >
              Desfazer
            </button>
          </div>
        </section>
      ) : null}

      <p style={{ margin: "34px 0 0", textAlign: "center", fontSize: 12.5, color: theme.faint }}>
        Conteúdo demonstrativo, fictício e não oficial.
      </p>
    </div>
  );
}
