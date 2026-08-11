"use client";

import { useActionState, useState } from "react";

import { theme as c } from "@/lib/appearance/palette";
import { answerExerciseAction, type ExerciseAnswerState } from "@/server/actions/student";

export type GuidedExercise = {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
};

type GuidedExerciseCardProps = {
  exercise: GuidedExercise;
};

const initialState: ExerciseAnswerState = { status: "idle" };

/**
 * Exercício guiado respondível direto no painel.
 *
 * Usa a mesma ação da missão (`answerExerciseAction`), então a resposta conta:
 * registra tentativa, dá XP na primeira acerto e agenda revisão quando é o
 * caso. A alternativa correta nunca chega ao cliente — o feedback vem do
 * servidor, referente só à opção escolhida.
 */
export function GuidedExerciseCard({ exercise }: GuidedExerciseCardProps) {
  const [state, formAction, isPending] = useActionState(answerExerciseAction, initialState);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const answered = state.status === "success" && !retrying;
  const failed = state.status === "error" && !retrying;
  const isCorrect = answered && state.isCorrect === true;

  return (
    <div
      style={{
        marginTop: 18,
        background: c.brandTint,
        border: `1px solid ${c.brandLine}`,
        borderRadius: 8,
        padding: 16
      }}
    >
      <style>{`
        .gx-option:hover:not(:disabled) { border-color: ${c.fill}; background: ${c.brandTint}; }
        .gx-feedback { animation: gx-in .25s ease both; }
        @keyframes gx-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .gx-feedback { animation: none !important; } }
      `}</style>

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
      <p style={{ margin: "8px 0 12px", fontSize: 14.5, fontWeight: 700, color: c.ink, lineHeight: 1.5 }}>
        {exercise.prompt}
      </p>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="hidden" name="exerciseId" value={exercise.id} />
        {exercise.options.map((option) => {
          const picked = pickedId === option.id;
          const settled = answered && picked;

          return (
            <button
              key={option.id}
              type="submit"
              name="selectedOptionId"
              value={option.id}
              disabled={isPending || answered}
              onClick={() => {
                setPickedId(option.id);
                setRetrying(false);
              }}
              className={answered ? undefined : "gx-option"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: isPending ? "wait" : answered ? "default" : "pointer",
                transition: "all .16s ease",
                background: settled ? (isCorrect ? c.brandSoft : "#fef2f2") : c.card,
                border: `1.5px solid ${settled ? (isCorrect ? c.fill : "#ef4444") : c.line}`,
                color: settled
                  ? isCorrect
                    ? c.brandInk
                    : "#b91c1c"
                  : answered
                    ? c.faint
                    : c.ink,
                opacity: isPending && !picked ? 0.6 : 1
              }}
            >
              <span>{option.text}</span>
              <span style={{ fontWeight: 800 }}>{settled ? (isCorrect ? "✓" : "✕") : ""}</span>
            </button>
          );
        })}
      </form>

      {isPending ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: c.muted }}>Registrando sua resposta...</p>
      ) : null}

      {answered ? (
        <div
          className="gx-feedback"
          style={{
            marginTop: 12,
            padding: "13px 14px",
            borderRadius: 8,
            background: isCorrect ? c.brandSoft : c.warnSoft,
            border: `1px solid ${isCorrect ? c.fill : c.warnFill}`,
            color: isCorrect ? c.brandInk : "#92400e"
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
            {isCorrect ? "Resposta correta!" : "Quase lá — veja a explicação"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, lineHeight: 1.55, opacity: 0.9 }}>{state.feedback}</p>
          {state.xpAwarded ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 700 }}>+{state.xpAwarded} XP</p>
          ) : null}
          {state.reviewCreated ? (
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.9 }}>
              Uma revisão foi agendada para reforçar este ponto.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setRetrying(true);
              setPickedId(null);
            }}
            style={{
              marginTop: 10,
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: 13,
              fontWeight: 700,
              color: "inherit",
              fontFamily: "inherit",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3
            }}
          >
            Tentar de novo
          </button>
        </div>
      ) : null}

      {failed ? (
        <p
          className="gx-feedback"
          style={{
            margin: "12px 0 0",
            padding: "11px 13px",
            borderRadius: 8,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            fontSize: 13.5,
            color: "#b91c1c"
          }}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
