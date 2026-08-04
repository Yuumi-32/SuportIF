"use client";

import { useMemo, useState, useTransition } from "react";

import { createCalendarEventAction, deleteCalendarEventAction } from "@/server/actions/workspace";
import { theme } from "@/lib/appearance/palette";

export type CalendarEventItem = {
  id: string;
  title: string;
  dateKey: string;
  time: string | null;
  type: "COMPROMISSO" | "EVENTO" | "REVISAO";
};

type CalendarDrawerProps = {
  events: CalendarEventItem[];
};

type View = "calendar" | "list" | "week" | "add";

const typeMeta: Record<CalendarEventItem["type"], { label: string; color: string; bg: string; bd: string }> = {
  COMPROMISSO: { label: "Compromisso", color: "#2563eb", bg: "#eff6ff", bd: "#bfdbfe" },
  EVENTO: { label: "Evento", color: "#d97706", bg: "#fffbeb", bd: "#fde68a" },
  REVISAO: { label: "Revisão", color: theme.brandInk, bg: theme.brandSoft, bd: theme.brandLine2 }
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

/** "2026-07-30" sem passar por Date, para não sofrer com fuso horário. */
function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey() {
  const now = new Date();
  return toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

function addDaysToKey(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function CalendarDrawer({ events }: CalendarDrawerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("calendar");
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(todayKey);
  const [formTime, setFormTime] = useState("");
  const [formType, setFormType] = useState<CalendarEventItem["type"]>("EVENTO");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const event of events) {
      const list = map.get(event.dateKey) ?? [];
      list.push(event);
      map.set(event.dateKey, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const leading = first.getDay();
    const out: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < leading; i += 1) out.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      out.push({ key: toDateKey(cursor.year, cursor.month, day), day });
    }
    return out;
  }, [cursor]);

  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const today = todayKey();
  const weekLimit = addDaysToKey(today, 7);
  const weekEvents = events.filter((e) => e.dateKey >= today && e.dateKey <= weekLimit);

  function submitEvent() {
    setError(null);
    const data = new FormData();
    data.set("title", formTitle);
    data.set("dateKey", formDate);
    data.set("time", formTime);
    data.set("type", formType);

    startTransition(async () => {
      const result = await createCalendarEventAction({ status: "idle" }, data);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível salvar.");
        return;
      }
      setFormTitle("");
      setFormTime("");
      setSelectedKey(formDate);
      setView("calendar");
    });
  }

  function removeEvent(id: string) {
    const data = new FormData();
    data.set("id", id);
    startTransition(async () => {
      await deleteCalendarEventAction({ status: "idle" }, data);
    });
  }

  function tabButtonStyle(active: boolean): React.CSSProperties {
    return {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      padding: "7px 4px",
      borderRadius: 8,
      border: active ? `1px solid ${theme.brandLine2}` : "1px solid transparent",
      background: active ? theme.brandSoft : "transparent",
      color: active ? theme.brandInk : theme.muted,
      fontSize: 10.5,
      fontWeight: 700,
      cursor: "pointer"
    };
  }

  function EventRow({ event, showDate }: { event: CalendarEventItem; showDate?: boolean }) {
    const meta = typeMeta[event.type];
    return (
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 10,
          padding: "10px 12px",
          background: theme.card,
          border: `1px solid ${theme.line}`,
          borderRadius: 9
        }}
      >
        <div style={{ width: 4, borderRadius: 999, background: meta.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 5,
                background: meta.bg,
                color: meta.color,
                border: `1px solid ${meta.bd}`
              }}
            >
              {meta.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.muted }}>
              {showDate ? formatDateKey(event.dateKey) : ""} {event.time ?? ""}
            </span>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 14, fontWeight: 600, color: theme.ink }}>{event.title}</p>
        </div>
        <button
          onClick={() => removeEvent(event.id)}
          title="Excluir"
          className="cal-del"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: theme.line2,
            fontSize: 16,
            alignSelf: "flex-start",
            padding: "0 2px"
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cal-del:hover { color: #ef4444 !important; }
        .cal-nav:hover { background: ${theme.chip}; }
        .cal-save:hover { background: ${theme.fillDark} !important; }
        .cal-cancel:hover { background: ${theme.surface}; }
        @media print { .cal-tab, .cal-panel { display: none !important; } }
      `}</style>

      {/* ABA LATERAL */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Abrir agenda"
        className="cal-tab"
        style={{
          position: "fixed",
          left: 0,
          top: "18%",
          marginTop: -52,
          zIndex: 99,
          width: 42,
          height: 104,
          background: "#0d9488",
          color: "#fff",
          border: "none",
          borderRadius: "0 12px 12px 0",
          cursor: "pointer",
          boxShadow: "2px 2px 12px rgba(0,0,0,.16)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          transform: open ? "translateX(290px)" : "translateX(0)",
          transition: "transform .3s cubic-bezier(.22,1,.36,1)"
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", writingMode: "vertical-rl", textOrientation: "mixed" }}>
          AGENDA
        </span>
      </button>

      {/* GAVETA */}
      <div
        className="cal-panel"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: 290,
          zIndex: 101,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform .3s cubic-bezier(.22,1,.36,1)",
          background: theme.card,
          boxShadow: "6px 0 28px rgba(0,0,0,.14)",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: "18px 18px 14px",
            borderBottom: `1px solid ${theme.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: theme.brandInk }}>
              Minha Agenda
            </p>
            <h3 style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 800, color: theme.ink }}>Compromissos e Eventos</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar agenda"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, color: theme.faint, padding: "0 2px" }}
          >
            ×
          </button>
        </div>

        <div style={{ flexShrink: 0, padding: "10px 14px", display: "flex", gap: 6, borderBottom: `1px solid ${theme.line}` }}>
          <button onClick={() => setView("calendar")} style={tabButtonStyle(view === "calendar")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            Agenda
          </button>
          <button onClick={() => setView("list")} style={tabButtonStyle(view === "list")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
            </svg>
            Eventos
          </button>
          <button onClick={() => setView("add")} style={tabButtonStyle(view === "add")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo
          </button>
          <button onClick={() => setView("week")} style={tabButtonStyle(view === "week")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            7 dias
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {view === "calendar" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <button
                  className="cal-nav"
                  onClick={() =>
                    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))
                  }
                  style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${theme.line}`, background: theme.card, cursor: "pointer", color: theme.ink2 }}
                >
                  ‹
                </button>
                <span style={{ fontSize: 15, fontWeight: 800, color: theme.ink }}>
                  {MONTHS[cursor.month]} {cursor.year}
                </span>
                <button
                  className="cal-nav"
                  onClick={() =>
                    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))
                  }
                  style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${theme.line}`, background: theme.card, cursor: "pointer", color: theme.ink2 }}
                >
                  ›
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 4 }}>
                {WEEKDAYS.map((w, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: theme.faint, padding: "2px 0" }}>
                    {w}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
                {cells.map((cell, i) => {
                  if (!cell) return <div key={`empty-${i}`} />;
                  const dayEvents = eventsByDay.get(cell.key) ?? [];
                  const isSelected = cell.key === selectedKey;
                  const isToday = cell.key === today;
                  return (
                    <div
                      key={cell.key}
                      onClick={() => setSelectedKey(cell.key)}
                      style={{
                        position: "relative",
                        height: 32,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 7,
                        fontSize: 12.5,
                        fontWeight: isToday ? 800 : 600,
                        cursor: "pointer",
                        background: isSelected ? theme.fill : isToday ? theme.brandSoft : "transparent",
                        color: isSelected ? "#fff" : isToday ? theme.brandInk : theme.ink2,
                        border: "1px solid " + (isSelected ? theme.fill : "transparent")
                      }}
                    >
                      {cell.day}
                      {dayEvents.length > 0 ? (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 4,
                            width: 5,
                            height: 5,
                            borderRadius: 999,
                            background: isSelected ? theme.card : typeMeta[dayEvents[0].type].color
                          }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${theme.line}` }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: theme.ink }}>
                  {formatDateKey(selectedKey)}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
                {selectedEvents.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: theme.faint }}>Nenhum evento neste dia.</p>
                ) : null}
              </div>
            </>
          ) : null}

          {view === "list" ? (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: theme.ink }}>
                Todos os Compromissos e Eventos
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {events.map((event) => (
                  <EventRow key={event.id} event={event} showDate />
                ))}
              </div>
              {events.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: theme.faint }}>Nenhum evento cadastrado.</p>
              ) : null}
            </>
          ) : null}

          {view === "week" ? (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: theme.ink }}>Próximos 7 Dias</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {weekEvents.map((event) => (
                  <EventRow key={event.id} event={event} showDate />
                ))}
              </div>
              {weekEvents.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: theme.faint }}>Nada nos próximos 7 dias.</p>
              ) : null}
            </>
          ) : null}

          {view === "add" ? (
            <>
              <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: theme.ink }}>Adicionar Novo Evento</p>

              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.ink2, marginBottom: 6 }}>Título</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Prova de Matemática"
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 12px",
                  border: `1px solid ${theme.line}`,
                  borderRadius: 8,
                  fontSize: 14,
                  color: theme.ink,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 14
                }}
              />

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.ink2, marginBottom: 6 }}>Data</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      padding: "0 12px",
                      border: `1px solid ${theme.line}`,
                      borderRadius: 8,
                      fontSize: 14,
                      color: theme.ink,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                <div style={{ width: 108 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.ink2, marginBottom: 6 }}>Hora</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      padding: "0 12px",
                      border: `1px solid ${theme.line}`,
                      borderRadius: 8,
                      fontSize: 14,
                      color: theme.ink,
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: theme.ink2, marginBottom: 6 }}>Tipo</label>
              <div style={{ display: "flex", gap: 7, marginBottom: 20 }}>
                {(Object.keys(typeMeta) as Array<CalendarEventItem["type"]>).map((key) => {
                  const meta = typeMeta[key];
                  const active = formType === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFormType(key)}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        border: `1px solid ${active ? meta.color : theme.line}`,
                        background: active ? meta.bg : theme.card,
                        color: active ? meta.color : theme.muted
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              {error ? (
                <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#b91c1c", fontWeight: 600 }}>{error}</p>
              ) : null}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="cal-cancel"
                  onClick={() => {
                    setView("calendar");
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    height: 44,
                    background: theme.card,
                    border: `1px solid ${theme.line}`,
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.muted
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="cal-save"
                  onClick={submitEvent}
                  disabled={isPending || formTitle.trim().length === 0}
                  style={{
                    flex: 1.4,
                    height: 44,
                    background: isPending || formTitle.trim().length === 0 ? theme.line2 : theme.fill,
                    border: "none",
                    borderRadius: 8,
                    cursor: isPending || formTitle.trim().length === 0 ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#fff",
                    boxShadow: "0 2px 6px rgba(91,33,182,.22)"
                  }}
                >
                  {isPending ? "Salvando..." : "Salvar Evento"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
