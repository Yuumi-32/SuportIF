"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackBox } from "@/components/exercises/feedback-box";
import { getMasteryStatusLabel } from "@/lib/learning/presentation";
import {
  answerExerciseAction,
  type ExerciseAnswerState
} from "@/server/actions/student";

type ExerciseCardProps = {
  id: string;
  order: number;
  prompt: string;
  explanation: string;
  options: Array<{
    id: string;
    text: string;
  }>;
  attempts: Array<{
    id: string;
    isCorrect: boolean;
    feedback: string;
  }>;
};

const initialState: ExerciseAnswerState = {
  status: "idle"
};

export function ExerciseCard({ id, order, prompt, explanation, options, attempts }: ExerciseCardProps) {
  const [state, formAction, isPending] = useActionState(answerExerciseAction, initialState);
  const lastAttempt = attempts[0];

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Exercício {order}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold text-slate-950">{prompt}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{explanation}</p>
        </div>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="exerciseId" value={id} />
          <div className="space-y-2">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-start gap-3 rounded-md border bg-white p-3 text-sm transition-colors hover:border-violet-200 hover:bg-violet-50/60"
              >
                <input
                  className="mt-1 accent-violet-700"
                  type="radio"
                  name="selectedOptionId"
                  value={option.id}
                  required
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enviando..." : "Responder"}
          </Button>
        </form>
        {state.status === "success" ? (
          <FeedbackBox
            isCorrect={state.isCorrect}
            title={state.isCorrect ? "Boa, resposta correta" : "Resposta registrada"}
          >
            <p>{state.feedback}</p>
            <p className="mt-2">
              XP ganho nesta resposta: <strong>{state.xpAwarded ?? 0}</strong>. XP atual:{" "}
              <strong>{state.totalXp ?? 0}</strong>. Nível: <strong>{state.level ?? 1}</strong>.
            </p>
            <p className="mt-1">Domínio da missão: {getMasteryStatusLabel(state.masteryStatus)}</p>
            {state.reviewCreated ? <p className="mt-1">Uma revisão foi agendada para reforçar este ponto.</p> : null}
          </FeedbackBox>
        ) : null}
        {state.status === "error" ? (
          <FeedbackBox title="Não foi possível registrar">
            <p>{state.message}</p>
          </FeedbackBox>
        ) : null}
        {lastAttempt && state.status === "idle" ? (
          <FeedbackBox isCorrect={lastAttempt.isCorrect} title="Última tentativa registrada">
            <p>{lastAttempt.feedback}</p>
          </FeedbackBox>
        ) : null}
      </CardContent>
    </Card>
  );
}
