"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { createStudyNoteAction, deleteStudyNoteAction, saveStudyNoteAction } from "@/server/actions/workspace";

export type StudyNoteItem = {
  id: string;
  title: string;
  content: string;
  folder: string;
  color: string;
};

type StickyNotesProps = {
  notes: StudyNoteItem[];
};

const palette: Record<string, { label: string; bg: string; line: string; ink: string; binding: string }> = {
  yellow: { label: "Amarelo", bg: "#fef9c3", line: "#fde68a", ink: "#713f12", binding: "#facc15" },
  green: { label: "Verde", bg: "#dcfce7", line: "#bbf7d0", ink: "#14532d", binding: "#4ade80" },
  blue: { label: "Azul", bg: "#dbeafe", line: "#bfdbfe", ink: "#1e3a5f", binding: "#60a5fa" },
  pink: { label: "Rosa", bg: "#fce7f3", line: "#fbcfe8", ink: "#831843", binding: "#f472b6" }
};

function paletteFor(color: string) {
  return palette[color] ?? palette.yellow;
}

export function StickyNotes({ notes }: StickyNotesProps) {
  const [open, setOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const [draft, setDraft] = useState<Record<string, { title: string; content: string }>>({});
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 260, h: 220 });
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [, startTransition] = useTransition();

  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; ox: number; oy: number } | null>(
    null
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = notes.find((n) => n.id === activeId) ?? notes[0] ?? null;
  const skin = paletteFor(active?.color ?? "yellow");

  const activeDraft = active ? (draft[active.id] ?? { title: active.title, content: active.content }) : null;

  // Posição inicial: canto superior direito da janela.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPos({ x: Math.max(16, window.innerWidth - size.w - 32), y: 96 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (drag.mode === "move") {
        setPos({ x: drag.ox + dx, y: drag.oy + dy });
      } else {
        setSize({ w: Math.max(210, drag.ox + dx), h: Math.max(160, drag.oy + dy) });
      }
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function queueSave(id: string, fields: { title?: string; content?: string }) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      startTransition(async () => {
        await saveStudyNoteAction({ id, ...fields });
      });
    }, 700);
  }

  function updateDraft(id: string, fields: { title?: string; content?: string }) {
    setDraft((prev) => {
      const base = prev[id] ?? {
        title: notes.find((n) => n.id === id)?.title ?? "",
        content: notes.find((n) => n.id === id)?.content ?? ""
      };
      return { ...prev, [id]: { ...base, ...fields } };
    });
    const merged = {
      title: fields.title ?? draft[id]?.title,
      content: fields.content ?? draft[id]?.content
    };
    queueSave(id, merged);
  }

  function addNote(folder?: string) {
    startTransition(async () => {
      const id = await createStudyNoteAction(folder);
      setActiveId(id);
      setBrowseOpen(false);
    });
  }

  function removeNote(id: string) {
    startTransition(async () => {
      await deleteStudyNoteAction({ id });
      if (activeId === id) {
        setActiveId(notes.find((n) => n.id !== id)?.id ?? null);
      }
    });
  }

  function setColor(color: string) {
    if (!active) return;
    startTransition(async () => {
      await saveStudyNoteAction({ id: active.id, color });
    });
  }

  return (
    <>
      <style>{`
        .note-tab:hover { background: #b45309 !important; }
        .note-icon-btn:hover { background: rgba(0,0,0,.06); }
        .note-del:hover { opacity: 1 !important; }
        @media print { .note-tab, .note-card { display: none !important; } }
      `}</style>

      {/* ABA LATERAL */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Abrir/fechar anotações"
        className="note-tab"
        style={{
          position: "fixed",
          left: 0,
          top: "18%",
          marginTop: 60,
          zIndex: 99,
          width: 42,
          height: 104,
          background: "#d97706",
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
          transition: "background .15s"
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", writingMode: "vertical-rl", textOrientation: "mixed" }}>
          NOTAS
        </span>
      </button>

      {open ? (
        <div
          className="note-card"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            width: size.w,
            zIndex: 100,
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(2,8,23,.22)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* faixa de arrasto */}
          <div
            onMouseDown={(e) => {
              dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
            }}
            style={{ height: 9, background: skin.binding, cursor: "grab", userSelect: "none", flexShrink: 0 }}
          />
          <div
            onMouseDown={(e) => {
              dragRef.current = { mode: "move", startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
            }}
            style={{
              background: skin.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px 8px",
              cursor: "grab",
              userSelect: "none",
              flexShrink: 0
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,.7)",
                    border: `1.5px solid ${skin.ink}`,
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,.28)"
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar notas"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, color: skin.ink, opacity: 0.6 }}
            >
              ×
            </button>
          </div>

          {/* barra de título */}
          <div
            style={{
              background: skin.bg,
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: `1px solid ${skin.line}`
            }}
          >
            <button
              onClick={() => setBrowseOpen((v) => !v)}
              title="Ver notas salvas"
              className="note-icon-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: skin.ink
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {active?.folder ?? "Geral"}
            </button>
            <input
              value={activeDraft?.title ?? ""}
              onChange={(e) => active && updateDraft(active.id, { title: e.target.value })}
              disabled={!active}
              placeholder="Título"
              style={{
                flex: 1,
                fontSize: 11.5,
                fontWeight: 700,
                color: skin.ink,
                textAlign: "center",
                background: "none",
                border: "none",
                borderBottom: `1px dashed ${skin.line}`,
                outline: "none",
                padding: "2px 4px",
                minWidth: 0,
                fontFamily: "inherit"
              }}
            />
            <button
              onClick={() => addNote(active?.folder)}
              title="Nova nota"
              className="note-icon-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                background: "none",
                border: `1px solid ${skin.line}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
                color: skin.ink
              }}
            >
              +
            </button>
          </div>

          {/* lista de notas */}
          {browseOpen ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: skin.bg,
                padding: 10,
                maxHeight: 260,
                overflowY: "auto"
              }}
            >
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => {
                    setActiveId(note.id);
                    setBrowseOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: note.id === active?.id ? "rgba(0,0,0,.07)" : "transparent"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: skin.ink }}>{note.title}</p>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(0,0,0,.06)", color: skin.ink }}>
                        {note.folder}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: skin.ink,
                        opacity: 0.55,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {note.content.slice(0, 60) || "Sem conteúdo"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNote(note.id);
                    }}
                    title="Excluir nota"
                    className="note-del"
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: skin.ink, opacity: 0.35, padding: "0 2px", flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}

              <div style={{ marginTop: 6, paddingTop: 8, borderTop: `1px solid ${skin.line}`, display: "flex", gap: 6 }}>
                <button
                  onClick={() => setNewFolderOpen((v) => !v)}
                  className="note-icon-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: `1px dashed ${skin.line}`,
                    borderRadius: 6,
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: skin.ink
                  }}
                >
                  + Nova pasta
                </button>
              </div>
              {newFolderOpen ? (
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nome da pasta"
                    style={{
                      flex: 1,
                      height: 30,
                      padding: "0 8px",
                      border: `1px solid ${skin.line}`,
                      borderRadius: 6,
                      fontSize: 12,
                      color: skin.ink,
                      background: "rgba(255,255,255,.5)",
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit"
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newFolderName.trim().length === 0) return;
                      addNote(newFolderName.trim());
                      setNewFolderName("");
                      setNewFolderOpen(false);
                    }}
                    style={{
                      height: 30,
                      padding: "0 10px",
                      background: skin.ink,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Criar
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <textarea
              value={activeDraft?.content ?? ""}
              onChange={(e) => active && updateDraft(active.id, { content: e.target.value })}
              disabled={!active}
              placeholder={active ? "Escreva suas anotações..." : "Crie uma nota no botão +"}
              style={{
                width: "100%",
                height: size.h,
                padding: "4px 12px 12px",
                background: skin.bg,
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 13,
                lineHeight: "24px",
                color: skin.ink,
                fontFamily: "inherit",
                backgroundImage: `repeating-linear-gradient(${skin.bg},${skin.bg} 23px,${skin.line} 23px,${skin.line} 24px)`,
                boxSizing: "border-box"
              }}
            />
          )}

          {/* rodapé: redimensionar + cores */}
          <div
            style={{
              background: skin.bg,
              padding: "7px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${skin.line}`
            }}
          >
            <div
              onMouseDown={(e) => {
                dragRef.current = { mode: "resize", startX: e.clientX, startY: e.clientY, ox: size.w, oy: size.h };
              }}
              title="Redimensionar"
              style={{ cursor: "nwse-resize", padding: 2, opacity: 0.45, color: skin.ink }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <line x1="9" y1="13" x2="0" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="5" y1="13" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {Object.entries(palette).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setColor(key)}
                  title={value.label}
                  aria-label={value.label}
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: "50%",
                    background: value.binding,
                    border: active?.color === key ? `2px solid ${skin.ink}` : "1px solid rgba(0,0,0,.15)",
                    cursor: "pointer",
                    padding: 0
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
