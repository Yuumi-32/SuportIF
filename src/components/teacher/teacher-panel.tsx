"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { theme } from "@/lib/appearance/palette";
import type { TeacherActionResult } from "@/lib/tutor/presentation";
import {
  saveTeacherModuleAction,
  setModulePublicationAction,
  setStudentFollowAction
} from "@/server/actions/teacher";
import type { TeacherPanel as TeacherPanelData, TeacherPanelStatus, TeacherPanelStudent } from "@/server/queries/tutor";

type Tab = "atencao" | "alunos" | "modulos" | "simulados";
type Period = "7d" | "30d" | "sem";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "atencao", label: "Precisam de Atenção" },
  { key: "alunos", label: "Alunos" },
  { key: "modulos", label: "Módulos" },
  { key: "simulados", label: "Simulados" }
];

const periods: Array<{ key: Period; label: string; days: number }> = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "sem", label: "Semestre", days: 180 }
];

/// Tons das etiquetas. O trio da pílula (fundo, borda, texto) é claro e fixo
/// dos dois lados do tema; `ink` é a mesma família quando a cor vira tinta
/// direta sobre o cartão — barra, borda ou texto — e precisa acompanhar o tema.
type Tone = { bg: string; border: string; color: string; ink: string };

const tones = {
  brand: { bg: theme.brandSoft, border: theme.brandLine2, color: theme.brandInk, ink: theme.brandInk },
  amber: { bg: theme.warnSoft, border: "#fde68a", color: theme.warn, ink: theme.warnInk },
  green: { bg: theme.okSoft, border: "#bbf7d0", color: theme.ok, ink: theme.okInk },
  red: { bg: theme.dangerSoft, border: "#fecaca", color: theme.danger, ink: theme.dangerInk },
  slate: { bg: theme.chip, border: theme.line, color: theme.ink2, ink: theme.ink2 }
} satisfies Record<string, Tone>;

const statusMeta: Record<TeacherPanelStatus, { label: string; short: string; tone: Tone }> = {
  ok: { label: "Em dia", short: "Em dia", tone: tones.green },
  atencao: { label: "Atenção", short: "Atenção", tone: tones.amber },
  risco: { label: "RISCO ALTO", short: "Risco", tone: tones.red }
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Número com a palavra no singular ou plural — "1 missão", "8 missões". */
function plural(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`;
}

/** Data curta "28/07", sem passar por toLocaleDateString para não variar de máquina. */
function shortDate(iso: string) {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function percentOf(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Verde acima de 70%, marca no meio, vermelho embaixo — a régua do desenho. */
function scoreColor(value: number) {
  if (value >= 70) {
    return theme.okInk;
  }

  return value >= 50 ? theme.warnInk : theme.dangerInk;
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
        borderRadius: 11,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
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

function ColumnLabel({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: ".05em",
        textTransform: "uppercase",
        color: theme.faint,
        textAlign: align
      }}
    >
      {children}
    </span>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        background: theme.brandSoft,
        color: theme.brandInk,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size <= 32 ? 12 : 13
      }}
    >
      {initials(name)}
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, padding: 28, textAlign: "center", fontSize: 14, color: theme.faint }}>{children}</p>
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

const outlineButton: React.CSSProperties = {
  height: 38,
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "0 15px",
  background: theme.card,
  border: `1px solid ${theme.brandLine2}`,
  borderRadius: 999,
  fontSize: 13.5,
  fontWeight: 700,
  color: theme.brandInk,
  cursor: "pointer",
  transition: "all .15s"
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

const emptyModuleForm = { id: "", trackId: "", title: "", description: "" };

export function TeacherPanel({ panel, teacherName }: { panel: TeacherPanelData; teacherName: string }) {
  const [tab, setTab] = useState<Tab>("atencao");
  const [period, setPeriod] = useState<Period>("30d");
  const [classFilter, setClassFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<TeacherActionResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [moduleForm, setModuleForm] = useState({ ...emptyModuleForm, trackId: panel.tracks[0]?.id ?? "" });
  const [moduleFormOpen, setModuleFormOpen] = useState(false);

  /** Toda ação do painel volta com um aviso; é ele que confirma o que gravou. */
  function run(id: string, action: () => Promise<TeacherActionResult>) {
    setBusyId(id);
    startTransition(async () => {
      const result = await action();
      setFeedback(result);
      setBusyId(null);
    });
  }

  const periodDef = periods.find((item) => item.key === period) ?? periods[1];
  const students = useMemo(
    () =>
      classFilter === "todas"
        ? panel.students
        : panel.students.filter((student) => student.classGroupId === classFilter),
    [panel.students, classFilter]
  );
  const visibleIds = useMemo(() => new Set(students.map((student) => student.id)), [students]);
  const selectedClass = panel.classes.find((item) => item.id === classFilter) ?? null;

  const attention = students.filter((student) => student.status !== "ok");
  const activeStudents = students.filter(
    (student) => student.inactiveDays !== null && student.inactiveDays <= periodDef.days
  ).length;
  const averageProgress = average(students.map((student) => student.progressPercent));
  const activePercent = percentOf(activeStudents, students.length);

  const kpis = [
    {
      key: "alunos",
      label: selectedClass ? "Alunos na Turma" : "Alunos Acompanhados",
      value: String(students.length),
      pct: 100,
      color: theme.fill,
      ink: theme.brandInk,
      hint: selectedClass
        ? [selectedClass.course, selectedClass.term].filter((item) => item && item !== "—").join(" · ") ||
          "Matriculados na turma"
        : `Em ${plural(panel.classes.length, "turma", "turmas")}`
    },
    {
      key: "progresso",
      label: "Progresso Médio",
      value: `${averageProgress}%`,
      pct: averageProgress,
      color: theme.fill,
      ink: theme.brandInk,
      hint: "Nos módulos publicados"
    },
    {
      key: "ativos",
      label: "Ativos no Período",
      value: String(activeStudents),
      pct: activePercent,
      color: theme.okInk,
      ink: theme.okInk,
      hint: `${activePercent}% acessou nos últimos ${periodDef.days} dias`
    },
    {
      key: "atencao",
      label: "Precisam de Atenção",
      value: String(attention.length),
      pct: percentOf(attention.length, students.length),
      color: theme.warnInk,
      ink: theme.warnInk,
      hint: "Baixo ritmo, nota fraca ou sem acesso"
    }
  ];

  const query = search.trim().toLowerCase();
  const filteredStudents = students.filter((student) => !query || student.name.toLowerCase().includes(query));

  const moduleRows = panel.modules.map((item) => {
    const visible = item.progress.filter((entry) => visibleIds.has(entry.studentId));

    return {
      ...item,
      students: visible.length,
      percent: average(visible.map((entry) => entry.percent))
    };
  });

  /// Cada simulado é recortado pela turma e pelo período escolhidos, e a nota
  /// que vale é a melhor de cada aluno — repetir a prova não conta duas vezes.
  const simulationRows = useMemo(() => {
    const cutoff = Date.now() - periodDef.days * 24 * 60 * 60 * 1000;

    return panel.simulations
      .map((simulation) => {
        const best = new Map<string, number>();
        let appliedAt = 0;

        for (const attempt of simulation.attempts) {
          const finishedAt = new Date(attempt.finishedAt).getTime();

          if (!visibleIds.has(attempt.studentId) || finishedAt < cutoff) {
            continue;
          }

          best.set(attempt.studentId, Math.max(best.get(attempt.studentId) ?? 0, attempt.score));
          appliedAt = Math.max(appliedAt, finishedAt);
        }

        const scores = Array.from(best.values());

        return {
          id: simulation.id,
          title: simulation.title,
          questions: simulation.questions,
          appliedAt,
          participants: scores.length,
          average: average(scores),
          high: percentOf(scores.filter((score) => score >= 70).length, scores.length),
          mid: percentOf(scores.filter((score) => score >= 50 && score < 70).length, scores.length),
          low: percentOf(scores.filter((score) => score < 50).length, scores.length)
        };
      })
      .filter((row) => row.participants > 0)
      .sort((a, b) => b.appliedAt - a.appliedAt);
  }, [panel.simulations, periodDef.days, visibleIds]);

  function toggleFollow(student: TeacherPanelStudent) {
    run(`follow-${student.id}`, () => setStudentFollowAction(student.id, !student.following));
  }

  function openModuleForm(item?: (typeof moduleRows)[number]) {
    setModuleForm(
      item
        ? { id: item.id, trackId: item.trackId, title: item.title, description: item.description }
        : { ...emptyModuleForm, trackId: panel.tracks[0]?.id ?? "" }
    );
    setModuleFormOpen(true);
  }

  function submitModule() {
    run("modulo-form", async () => {
      const result = await saveTeacherModuleAction({
        id: moduleForm.id || undefined,
        trackId: moduleForm.trackId,
        title: moduleForm.title,
        description: moduleForm.description
      });

      if (result.ok) {
        setModuleFormOpen(false);
        setModuleForm({ ...emptyModuleForm, trackId: panel.tracks[0]?.id ?? "" });
      }

      return result;
    });
  }

  /** Relatório do que está na tela, no separador que o Excel pt-BR entende. */
  function exportReport() {
    const lines = [
      ["SuportIF — relatório da turma"],
      ["Turma", selectedClass ? selectedClass.name : "Todas as turmas"],
      ["Período", periodDef.label],
      [],
      ["Indicador", "Valor"],
      ...kpis.map((kpi) => [kpi.label, kpi.value]),
      [],
      ["Aluno", "Turma", "Progresso", "Simulados entregues", "Média nos simulados", "Situação", "Último acesso", "Acompanhando"],
      ...students.map((student) => [
        student.name,
        student.className,
        `${student.progressPercent}%`,
        `${student.simulationsDone}/${panel.simulationTotal}`,
        student.simulationAverage === null ? "—" : `${student.simulationAverage}%`,
        statusMeta[student.status].label,
        student.lastAccess,
        student.following ? "Sim" : "Não"
      ])
    ];

    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `suportif-turma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setFeedback({ ok: true, message: "Relatório da turma exportado em CSV." });
  }

  return (
    <div className="tch">
      <style>{`
        .tch .tch-primary:hover { background: ${theme.fillDark}; }
        .tch .tch-ghost:hover { background: ${theme.surface}; }
        .tch .tch-outline:hover { background: ${theme.brandTint}; border-color: ${theme.fill}; }
        .tch .tch-card:hover { border-color: ${theme.brandLine2}; box-shadow: 0 4px 16px ${theme.shadow}; }
        .tch .tch-row:hover { background: ${theme.surface}; }
        .tch .tch-input:focus { border-color: ${theme.fill}; }
        .tch .tch-name:hover { color: ${theme.brandInk}; text-decoration: underline; }
        .tch .tch-scroll { overflow-x: auto; }
        @keyframes tch-rise { from { transform: translateY(14px); } to { transform: none; } }
        @keyframes tch-fade { from { transform: translateY(-4px); } to { transform: none; } }
        @media (max-width: 1000px) {
          .tch .tch-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .tch .tch-attention { grid-template-columns: 1fr !important; }
          .tch .tch-form-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .tch .tch-kpis { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) { .tch * { animation: none !important; transition: none !important; } }
      `}</style>

      {/* CABEÇALHO */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          animation: "tch-rise .5s ease both"
        }}
      >
        <div>
          <Pill tone={tones.brand}>PAINEL DO PROFESSOR</Pill>
          <h1 style={{ margin: "12px 0 0", fontSize: 29, fontWeight: 800, letterSpacing: "-.02em", color: theme.ink }}>
            Olá, {teacherName.replace(/^prof\.?\s+/i, "").split(" ")[0]}!
          </h1>
          <p style={{ margin: "9px 0 0", maxWidth: "64ch", fontSize: 15.5, lineHeight: 1.6, color: theme.ink2 }}>
            Acompanhe o progresso das suas turmas, identifique quem precisa de apoio e gerencie o conteúdo dos
            módulos.
          </p>
          <div style={{ margin: "12px 0 0", height: 2, width: 48, background: theme.fill, borderRadius: 999 }} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="tch-input"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            aria-label="Filtrar por turma"
            style={{
              height: 38,
              padding: "0 12px",
              border: `1px solid ${theme.line}`,
              borderRadius: 999,
              background: theme.card,
              fontSize: 13.5,
              fontWeight: 600,
              color: theme.ink2,
              cursor: "pointer",
              outline: "none",
              transition: "border-color .15s"
            }}
          >
            <option value="todas">Todas as turmas</option>
            {panel.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {periods.map((item) => {
            const active = item.key === period;
            return (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key)}
                className="tch-ghost"
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
          <button onClick={exportReport} className="tch-primary" style={primaryButton}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar
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
            animation: "tch-fade .28s ease both",
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
        className="tch-kpis"
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          animation: "tch-rise .5s ease both",
          animationDelay: ".05s"
        }}
      >
        {kpis.map((kpi) => (
          <Card
            key={kpi.key}
            className="tch-card"
            style={{ padding: "16px 18px", transition: "border-color .18s, box-shadow .18s" }}
          >
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
              <Bar pct={kpi.pct} color={kpi.color} />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, fontWeight: 600, color: kpi.ink }}>{kpi.hint}</p>
          </Card>
        ))}
      </div>

      {/* ABAS */}
      <div
        className="tch-scroll"
        style={{
          marginTop: 28,
          display: "flex",
          gap: 6,
          borderBottom: `1px solid ${theme.line}`,
          animation: "tch-rise .5s ease both",
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
                padding: "0 16px",
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

      {/* PRECISAM DE ATENÇÃO */}
      {tab === "atencao" ? (
        <section style={{ marginTop: 22, animation: "tch-rise .45s ease both" }}>
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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.ink }}>
              Alunos que Precisam de Atenção:
            </h2>
            <span style={{ fontSize: 13, color: theme.muted }}>
              Mostrando{" "}
              <strong style={{ color: theme.ink }}>
                {attention.length} de {students.length}
              </strong>
            </span>
          </div>

          {attention.length > 0 ? (
            <div className="tch-attention" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {attention.map((student) => {
                const meta = statusMeta[student.status];
                const busy = busyId === `follow-${student.id}`;

                return (
                  <Card
                    key={student.id}
                    className="tch-card"
                    style={{
                      padding: "15px 17px",
                      borderLeft: `3px solid ${meta.tone.ink}`,
                      transition: "border-color .18s, box-shadow .18s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                        <Avatar name={student.name} size={36} />
                        <div style={{ minWidth: 0 }}>
                          <Link
                            href={`/tutor/alunos/${student.id}`}
                            className="tch-name"
                            style={{ fontSize: 15, fontWeight: 700, color: theme.ink, textDecoration: "none" }}
                          >
                            {student.name}
                          </Link>
                          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: theme.muted }}>{student.className}</p>
                        </div>
                      </div>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </div>

                    <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.55, color: theme.ink2 }}>
                      {student.reason}
                    </p>

                    <div
                      style={{
                        marginTop: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ display: "flex", gap: 16 }}>
                        <div>
                          <ColumnLabel>Progresso</ColumnLabel>
                          <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: theme.ink }}>
                            {student.progressPercent}%
                          </p>
                        </div>
                        <div>
                          <ColumnLabel>Último Acesso</ColumnLabel>
                          <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: theme.ink }}>
                            {student.lastAccess}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFollow(student)}
                        disabled={busy}
                        className={student.following ? "tch-primary" : "tch-outline"}
                        style={{
                          height: 34,
                          padding: "0 13px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: busy ? "progress" : "pointer",
                          transition: "all .15s",
                          background: student.following ? theme.fill : theme.card,
                          border: `1px solid ${student.following ? theme.fill : theme.brandLine2}`,
                          color: student.following ? theme.onFill : theme.brandInk
                        }}
                      >
                        {busy ? "Salvando..." : student.following ? "Acompanhando" : "Acompanhar"}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <EmptyLine>
                {students.length > 0
                  ? "Ninguém está em risco agora — a turma toda está em dia."
                  : "Nenhum aluno vinculado a esta turma ainda."}
              </EmptyLine>
            </Card>
          )}
        </section>
      ) : null}

      {/* LISTA DE ALUNOS */}
      {tab === "alunos" ? (
        <section style={{ marginTop: 22, animation: "tch-rise .45s ease both" }}>
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
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.ink }}>Lista de Alunos:</h2>
            <input
              className="tch-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar aluno..."
              aria-label="Buscar aluno"
              style={{
                width: 230,
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
          </div>

          <Card style={{ borderRadius: 12, overflow: "hidden" }}>
            <div className="tch-scroll">
              <div style={{ minWidth: 720 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.1fr 1.1fr 1.5fr 1fr 1fr 96px",
                    gap: 12,
                    padding: "12px 18px",
                    background: theme.surface,
                    borderBottom: `1px solid ${theme.line}`
                  }}
                >
                  <ColumnLabel>Aluno</ColumnLabel>
                  <ColumnLabel>Turma</ColumnLabel>
                  <ColumnLabel>Progresso</ColumnLabel>
                  <ColumnLabel>Simulados</ColumnLabel>
                  <ColumnLabel>Status</ColumnLabel>
                  <ColumnLabel align="right">Ação</ColumnLabel>
                </div>

                {filteredStudents.map((student) => {
                  const meta = statusMeta[student.status];
                  const busy = busyId === `follow-${student.id}`;
                  const barColor =
                    student.progressPercent >= 70
                      ? theme.okInk
                      : student.progressPercent >= 40
                        ? theme.fill
                        : theme.dangerInk;

                  return (
                    <div
                      key={student.id}
                      className="tch-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2.1fr 1.1fr 1.5fr 1fr 1fr 96px",
                        gap: 12,
                        alignItems: "center",
                        padding: "13px 18px",
                        borderBottom: `1px solid ${theme.line}`,
                        transition: "background .14s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Avatar name={student.name} size={32} />
                        <Link
                          href={`/tutor/alunos/${student.id}`}
                          className="tch-name"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: theme.ink,
                            textDecoration: "none",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {student.name}
                        </Link>
                      </div>
                      <span style={{ fontSize: 13, color: theme.muted }}>{student.className}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ flex: 1, maxWidth: 104 }}>
                          <Bar pct={student.progressPercent} color={barColor} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.ink2 }}>
                          {student.progressPercent}%
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.ink2 }}>
                        {student.simulationsDone}/{panel.simulationTotal}
                      </span>
                      <Pill tone={meta.tone}>{meta.short}</Pill>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => toggleFollow(student)}
                          disabled={busy}
                          title={student.following ? "Remover acompanhamento" : "Marcar como acompanhado"}
                          aria-label={student.following ? "Remover acompanhamento" : "Marcar como acompanhado"}
                          style={{
                            width: 32,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            cursor: busy ? "progress" : "pointer",
                            transition: "all .15s",
                            background: student.following ? theme.fill : theme.card,
                            border: `1px solid ${student.following ? theme.fill : theme.line}`,
                            color: student.following ? theme.onFill : theme.faint
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 ? (
                  <EmptyLine>
                    {students.length === 0
                      ? "Nenhum aluno vinculado a esta turma ainda."
                      : "Nenhum aluno encontrado com esse nome."}
                  </EmptyLine>
                ) : null}
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {/* MÓDULOS */}
      {tab === "modulos" ? (
        <section style={{ marginTop: 22, animation: "tch-rise .45s ease both" }}>
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
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: theme.ink }}>Módulos e Missões:</h2>
              <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.muted }}>
                A conclusão é a média{" "}
                {selectedClass ? `da turma ${selectedClass.name}` : "de quem está matriculado na trilha"}. Publicar
                coloca o módulo na trilha do aluno na hora.
              </p>
            </div>
            <button onClick={() => openModuleForm()} className="tch-outline" style={outlineButton}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Novo Módulo
            </button>
          </div>

          {moduleFormOpen ? (
            <Card style={{ padding: "20px 22px", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.ink }}>
                {moduleForm.id ? "Editar módulo" : "Novo módulo"}
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.muted }}>
                O módulo novo nasce como rascunho. As missões e os exercícios continuam no cadastro do admin.
              </p>
              <div
                className="tch-form-grid"
                style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
              >
                <div>
                  <label style={labelStyle} htmlFor="modulo-trilha">
                    Trilha
                  </label>
                  <select
                    id="modulo-trilha"
                    className="tch-input"
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={moduleForm.trackId}
                    onChange={(event) => setModuleForm({ ...moduleForm, trackId: event.target.value })}
                  >
                    {panel.tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="modulo-titulo">
                    Título
                  </label>
                  <input
                    id="modulo-titulo"
                    className="tch-input"
                    style={inputStyle}
                    value={moduleForm.title}
                    onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })}
                    placeholder="Ex.: Fundamentos de Redes"
                  />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={labelStyle} htmlFor="modulo-descricao">
                  Descrição
                </label>
                <textarea
                  id="modulo-descricao"
                  className="tch-input"
                  style={{ ...inputStyle, height: 84, padding: "10px 13px", resize: "vertical", lineHeight: 1.5 }}
                  value={moduleForm.description}
                  onChange={(event) => setModuleForm({ ...moduleForm, description: event.target.value })}
                  placeholder="Uma frase sobre o que o aluno aprende neste módulo."
                />
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={submitModule}
                  disabled={busyId === "modulo-form"}
                  className="tch-primary"
                  style={primaryButton}
                >
                  {busyId === "modulo-form" ? "Salvando..." : "Salvar módulo"}
                </button>
                <button
                  onClick={() => setModuleFormOpen(false)}
                  className="tch-ghost"
                  style={{
                    height: 38,
                    padding: "0 15px",
                    background: theme.card,
                    border: `1px solid ${theme.line}`,
                    borderRadius: 999,
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: theme.ink2,
                    cursor: "pointer",
                    transition: "all .15s"
                  }}
                >
                  Cancelar
                </button>
              </div>
            </Card>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {moduleRows.map((item) => {
              const busy = busyId === `modulo-${item.id}`;

              return (
                <Card
                  key={item.id}
                  className="tch-card"
                  style={{ padding: "16px 18px", transition: "border-color .18s, box-shadow .18s" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.ink }}>{item.title}</p>
                        <Pill tone={item.published ? tones.brand : tones.slate}>
                          {item.published ? "Publicado" : "Rascunho"}
                        </Pill>
                      </div>
                      <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.muted }}>
                        {[
                          item.trackTitle,
                          plural(item.missions, "missão", "missões"),
                          plural(item.exercises, "exercício", "exercícios")
                        ].join(" · ")}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 200 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 14,
                            marginBottom: 5
                          }}
                        >
                          <ColumnLabel>Conclusão</ColumnLabel>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.brandInk }}>
                            {item.students > 0 ? `${item.percent}%` : "sem alunos"}
                          </span>
                        </div>
                        <Bar pct={item.percent} color={theme.fill} />
                      </div>
                      <button
                        onClick={() => openModuleForm(item)}
                        className="tch-ghost"
                        style={{
                          height: 36,
                          padding: "0 14px",
                          background: theme.card,
                          border: `1px solid ${theme.line}`,
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: theme.ink2,
                          cursor: "pointer",
                          transition: "all .15s"
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() =>
                          run(`modulo-${item.id}`, () => setModulePublicationAction(item.id, !item.published))
                        }
                        disabled={busy}
                        className={item.published ? "tch-ghost" : "tch-primary"}
                        style={{
                          height: 36,
                          padding: "0 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: busy ? "progress" : "pointer",
                          transition: "all .15s",
                          background: item.published ? theme.card : theme.fill,
                          border: `1px solid ${item.published ? theme.line : theme.fill}`,
                          color: item.published ? theme.muted : theme.onFill
                        }}
                      >
                        {busy ? "..." : item.published ? "Despublicar" : "Publicar"}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {moduleRows.length === 0 ? (
              <Card>
                <EmptyLine>Nenhum módulo cadastrado ainda. Use &quot;Novo Módulo&quot; para começar.</EmptyLine>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* SIMULADOS */}
      {tab === "simulados" ? (
        <section style={{ marginTop: 22, animation: "tch-rise .45s ease both" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 800, color: theme.ink }}>
            Resultados por Simulado:
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {simulationRows.map((simulation) => (
              <Card
                key={simulation.id}
                className="tch-card"
                style={{ padding: "16px 18px", transition: "border-color .18s, box-shadow .18s" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap"
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: theme.ink }}>{simulation.title}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 13.5, color: theme.muted }}>
                      {`Última entrega em ${shortDate(new Date(simulation.appliedAt).toISOString())} · ${plural(
                        simulation.questions,
                        "questão",
                        "questões"
                      )}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <ColumnLabel>Média da Turma</ColumnLabel>
                      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: scoreColor(simulation.average) }}>
                        {simulation.average}%
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <ColumnLabel>Participação</ColumnLabel>
                      <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 800, color: theme.ink }}>
                        {percentOf(simulation.participants, students.length)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.muted, minWidth: 118 }}>
                    Faixa de Notas
                  </span>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      height: 9,
                      borderRadius: 999,
                      overflow: "hidden",
                      background: theme.chip
                    }}
                  >
                    <div style={{ width: `${simulation.high}%`, background: theme.okInk }} />
                    <div style={{ width: `${simulation.mid}%`, background: theme.warnInk }} />
                    <div style={{ width: `${simulation.low}%`, background: theme.dangerInk }} />
                  </div>
                </div>
                <div style={{ marginTop: 9, display: "flex", gap: 18, flexWrap: "wrap" }}>
                  {[
                    { key: "alta", color: theme.okInk, label: "Acima de 70%", value: simulation.high },
                    { key: "media", color: theme.warnInk, label: "Entre 50 e 70%", value: simulation.mid },
                    { key: "baixa", color: theme.dangerInk, label: "Abaixo de 50%", value: simulation.low }
                  ].map((band) => (
                    <span
                      key={band.key}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.ink2 }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: band.color }} />
                      {band.label} ({band.value}%)
                    </span>
                  ))}
                </div>
              </Card>
            ))}

            {simulationRows.length === 0 ? (
              <Card>
                <EmptyLine>
                  Nenhum simulado entregue {selectedClass ? `pela turma ${selectedClass.name} ` : ""}nos últimos{" "}
                  {periodDef.days} dias.
                </EmptyLine>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      <p style={{ margin: "34px 0 0", textAlign: "center", fontSize: 12.5, color: theme.faint }}>
        Conteúdo demonstrativo, fictício e não oficial.
      </p>
    </div>
  );
}
