"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsDownUp,
  Eye,
  EyeOff,
  GripVertical,
  LayoutGrid,
  RotateCcw,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  blockBox,
  blockLabels,
  blockSizeLabels,
  blockSpan,
  defaultLayouts,
  isFreeCanvas,
  moveItem,
  sizeFromWidth,
  withBox,
  type BlockBox,
  type BlockSize,
  type DashboardLayoutItem,
  type LayoutPage
} from "@/lib/appearance/layout";
import { theme } from "@/lib/appearance/palette";
import { updatePageLayoutAction } from "@/server/actions/settings";

export type CanvasBlock = {
  id: string;
  render: (size: BlockSize) => React.ReactNode;
};

type LayoutCanvasProps = {
  page: LayoutPage;
  blocks: CanvasBlock[];
  layout: DashboardLayoutItem[];
  /** Modo de interface livre ligado em /configuracao. */
  freeLayout: boolean;
  /** Entrou pela URL com ?editar=1. */
  startEditing: boolean;
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  pointerX: number;
  pointerY: number;
  box: BlockBox;
};

const MIN_W = 220;
const MIN_H = 120;
const CANVAS_PADDING = 32;

const toolbarButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  border: `1px solid ${theme.brandLine2}`,
  borderRadius: 6,
  background: theme.card,
  color: theme.brandInk,
  cursor: "pointer",
  padding: 0,
  transition: "transform .12s ease, background .12s ease"
};

const barButton: React.CSSProperties = {
  ...toolbarButton,
  width: "auto",
  height: 32,
  gap: 6,
  padding: "0 12px",
  fontSize: 12.5,
  fontWeight: 600
};

export function LayoutCanvas({ page, blocks, layout, freeLayout, startEditing }: LayoutCanvasProps) {
  const [editing, setEditing] = useState(freeLayout && startEditing);
  const [draft, setDraft] = useState<DashboardLayoutItem[]>(layout);
  const [saved, setSaved] = useState<DashboardLayoutItem[]>(layout);
  const [dragging, setDragging] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canvasRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef(new Map<string, HTMLDivElement>());
  const dragRef = useRef<DragState | null>(null);

  // Com o modo desligado a página volta ao desenho padrão, sem perder o que
  // já foi personalizado.
  const active = freeLayout ? draft : defaultLayouts[page];
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const free = freeLayout && isFreeCanvas(active);

  const registerSlot = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      slotRefs.current.set(id, element);
    } else {
      slotRefs.current.delete(id);
    }
  }, []);

  /**
   * Fotografa onde cada bloco está desenhado agora. É assim que a grade vira
   * canvas livre sem nada saltar de lugar: o primeiro arraste começa exatamente
   * da posição que já estava na tela.
   */
  const captureBoxes = useCallback((items: DashboardLayoutItem[]): DashboardLayoutItem[] => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return items;
    }

    const origin = canvas.getBoundingClientRect();

    return items.map((item) => {
      if (blockBox(item)) {
        return item;
      }

      const element = slotRefs.current.get(item.id);
      if (!element) {
        return item;
      }

      const rect = element.getBoundingClientRect();
      return withBox(item, {
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        w: rect.width,
        h: rect.height
      });
    });
  }, []);

  function patch(id: string, fields: Partial<DashboardLayoutItem>) {
    setDraft((current) => current.map((item) => (item.id === id ? { ...item, ...fields } : item)));
  }

  /** Traz o bloco para a frente: quem é desenhado por último fica por cima. */
  function bringToFront(items: DashboardLayoutItem[], id: string) {
    const index = items.findIndex((item) => item.id === id);
    return index < 0 ? items : moveItem(items, index, items.length - 1);
  }

  function startPointer(event: React.PointerEvent, id: string, mode: "move" | "resize") {
    if (!editing) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

    setDraft((current) => {
      const measured = captureBoxes(current);
      const item = measured.find((entry) => entry.id === id);
      const box = item ? blockBox(item) : null;

      if (box) {
        dragRef.current = { id, mode, pointerX: event.clientX, pointerY: event.clientY, box };
      }

      return bringToFront(measured, id);
    });

    setDragging(id);
  }

  useEffect(() => {
    if (!dragging) {
      return;
    }

    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const dx = event.clientX - drag.pointerX;
      const dy = event.clientY - drag.pointerY;

      const next: BlockBox =
        drag.mode === "move"
          ? { ...drag.box, x: Math.max(0, drag.box.x + dx), y: Math.max(0, drag.box.y + dy) }
          : {
              ...drag.box,
              w: Math.max(MIN_W, drag.box.w + dx),
              h: Math.max(MIN_H, drag.box.h + dy)
            };

      setDraft((current) =>
        current.map((item) => (item.id === drag.id ? withBox(item, next) : item))
      );
    }

    function onUp() {
      dragRef.current = null;
      setDragging(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging]);

  /** Ajusta a altura ao conteúdo — tira a barra de rolagem de dentro do bloco. */
  function fitHeight(id: string) {
    const element = slotRefs.current.get(id)?.querySelector<HTMLElement>(".lay-content");
    if (!element) {
      return;
    }

    setDraft((current) => {
      const measured = captureBoxes(current);
      return measured.map((item) => {
        const box = item.id === id ? blockBox(item) : null;
        return box ? withBox(item, { ...box, h: element.scrollHeight + 2 }) : item;
      });
    });
  }

  function save() {
    const snapshot = draft;
    startTransition(async () => {
      const result = await updatePageLayoutAction(page, snapshot);
      if (result.status === "success") {
        setSaved(snapshot);
        setEditing(false);
      }
    });
  }

  function restore() {
    setDraft(defaultLayouts[page]);
  }

  // Altura e largura que o canvas precisa ter para caber todos os blocos.
  const extent = active.reduce(
    (acc, item) => {
      const box = blockBox(item);
      return box
        ? { width: Math.max(acc.width, box.x + box.w), height: Math.max(acc.height, box.y + box.h) }
        : acc;
    },
    { width: 0, height: 0 }
  );

  return (
    <>
      <style>{`
        .lay-canvas { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 20px; align-items: start; }
        .lay-canvas.lay-free { display: block; position: relative; }
        .lay-slot { min-width: 0; }
        .lay-canvas:not(.lay-editing) > .lay-slot { animation: lay-enter .5s cubic-bezier(.22,1,.36,1) both; }
        .lay-free > .lay-slot { position: absolute; }
        .lay-free > .lay-slot > .lay-content { height: 100%; overflow: auto; }

        .lay-editing .lay-slot {
          border-radius: 14px;
          outline: 2px dashed ${theme.brandLine2};
          outline-offset: 5px;
        }
        .lay-canvas.lay-editing:not(.lay-free) .lay-slot { position: relative; }
        .lay-editing .lay-slot > .lay-content { pointer-events: none; }
        .lay-editing .lay-slot:hover { outline-color: ${theme.brandMid}; }

        .lay-slot[data-dragging="true"] { outline: 2px solid ${theme.fill}; box-shadow: 0 18px 40px ${theme.shadow}; z-index: 5; }
        .lay-content { animation: lay-resize .32s cubic-bezier(.22,1,.36,1) both; }
        .lay-free .lay-content { animation: none; }
        .lay-handle { cursor: grab; touch-action: none; }
        .lay-handle:active { cursor: grabbing; }
        .lay-grip {
          position: absolute; right: -6px; bottom: -6px; width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid ${theme.brandLine2}; border-radius: 6px;
          background: ${theme.card}; color: ${theme.brandInk};
          cursor: nwse-resize; touch-action: none; z-index: 3;
        }
        .lay-btn:hover { background: ${theme.brandSoft}; transform: translateY(-1px); }
        .lay-bar { animation: lay-bar-in .3s cubic-bezier(.22,1,.36,1) both; }
        .lay-dragging, .lay-dragging * { user-select: none !important; }

        @keyframes lay-enter { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
        @keyframes lay-resize { from { opacity: .35; transform: scale(.97); } to { opacity: 1; transform: none; } }
        @keyframes lay-bar-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }

        @media (max-width: 900px) {
          .lay-canvas:not(.lay-free) { grid-template-columns: 1fr; }
          .lay-canvas:not(.lay-free) > .lay-slot { grid-column: auto !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lay-canvas > .lay-slot, .lay-content, .lay-bar { animation: none !important; }
        }
      `}</style>

      {editing ? (
        <div
          className="lay-bar"
          style={{
            position: "sticky",
            top: 76,
            zIndex: 30,
            marginBottom: 24,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            border: `1px solid ${theme.brandLine2}`,
            background: theme.brandTint,
            boxShadow: `0 10px 30px ${theme.shadow}`
          }}
        >
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: theme.brandInk }}
          >
            <LayoutGrid size={16} /> Modo edição
          </span>
          <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: theme.ink2 }}>
            Arraste pela barrinha para levar o bloco a qualquer lugar e puxe a alça do canto para
            redimensionar. Quanto mais estreito, mais resumido fica o conteúdo.
          </span>

          <button type="button" className="lay-btn" onClick={restore} style={barButton}>
            <RotateCcw size={14} /> Restaurar
          </button>
          <button
            type="button"
            className="lay-btn"
            onClick={() => {
              setDraft(saved);
              setEditing(false);
            }}
            style={barButton}
          >
            <X size={14} /> Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 32,
              padding: "0 14px",
              border: "none",
              borderRadius: 6,
              background: theme.fill,
              color: theme.onFill,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.7 : 1
            }}
          >
            <Check size={14} /> {isPending ? "Salvando..." : isDirty ? "Salvar layout" : "Concluir"}
          </button>
        </div>
      ) : freeLayout ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            type="button"
            className="lay-btn"
            onClick={() => setEditing(true)}
            style={{ ...barButton, height: 34 }}
          >
            <LayoutGrid size={15} /> Editar layout
          </button>
        </div>
      ) : null}

      <div
        ref={canvasRef}
        className={`lay-canvas${editing ? " lay-editing" : ""}${free ? " lay-free" : ""}${dragging ? " lay-dragging" : ""}`}
        style={
          free
            ? { height: extent.height + CANVAS_PADDING, minWidth: extent.width }
            : undefined
        }
      >
        {active.map((item, index) => {
          const block = blockById.get(item.id);

          if (!block || (item.hidden && !editing)) {
            return null;
          }

          const box = blockBox(item);
          const positioned = free && box ? box : null;
          const size = positioned ? sizeFromWidth(positioned.w) : item.size;

          const slotStyle: React.CSSProperties = positioned
            ? { left: positioned.x, top: positioned.y, width: positioned.w, height: positioned.h }
            : {
                gridColumn: `span ${item.hidden ? 2 : blockSpan[item.size]}`,
                animationDelay: editing ? undefined : `${index * 60}ms`
              };

          return (
            <div
              key={item.id}
              ref={(element) => registerSlot(item.id, element)}
              className="lay-slot"
              data-dragging={dragging === item.id ? "true" : undefined}
              style={slotStyle}
            >
              {editing ? (
                <div
                  className="lay-handle"
                  onPointerDown={(event) => startPointer(event, item.id, "move")}
                  style={{
                    position: "absolute",
                    top: -15,
                    left: 8,
                    right: 8,
                    zIndex: 2,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 8px",
                    borderRadius: 8,
                    border: `1px solid ${theme.brandLine2}`,
                    background: theme.card,
                    boxShadow: `0 6px 18px ${theme.shadow}`
                  }}
                >
                  <span style={{ display: "inline-flex", color: theme.faint }}>
                    <GripVertical size={15} />
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                      fontWeight: 700,
                      color: theme.brandInk
                    }}
                  >
                    {blockLabels[item.id] ?? item.id}
                    {item.hidden ? " · oculto" : ` · ${blockSizeLabels[size]}`}
                  </span>

                  {free ? (
                    <button
                      type="button"
                      className="lay-btn"
                      title="Ajustar altura ao conteúdo"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => fitHeight(item.id)}
                      style={toolbarButton}
                    >
                      <ChevronsDownUp size={14} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="lay-btn"
                        title="Mover para trás"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setDraft((current) => moveItem(current, index, index - 1))}
                        style={toolbarButton}
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className="lay-btn"
                        title="Mover para frente"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => setDraft((current) => moveItem(current, index, index + 1))}
                        style={toolbarButton}
                      >
                        <ArrowRight size={14} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className="lay-btn"
                    title={item.hidden ? "Mostrar bloco" : "Ocultar bloco"}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => patch(item.id, { hidden: !item.hidden })}
                    style={toolbarButton}
                  >
                    {item.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              ) : null}

              {item.hidden ? (
                <div
                  style={{
                    marginTop: 20,
                    display: "flex",
                    minHeight: 96,
                    height: positioned ? "calc(100% - 20px)" : undefined,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                    border: `1px dashed ${theme.line2}`,
                    borderRadius: 10,
                    background: theme.card,
                    color: theme.muted,
                    fontSize: 12.5,
                    textAlign: "center"
                  }}
                >
                  {blockLabels[item.id] ?? item.id} está oculto
                </div>
              ) : (
                <div className="lay-content" key={size} style={{ marginTop: editing && !free ? 20 : 0 }}>
                  {block.render(size)}
                </div>
              )}

              {editing && !item.hidden ? (
                <span
                  className="lay-grip"
                  title="Redimensionar"
                  onPointerDown={(event) => startPointer(event, item.id, "resize")}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M11 4 4 11M11 8l-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
