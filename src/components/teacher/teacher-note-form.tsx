"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTeacherNoteAction,
  type TeacherNoteState
} from "@/server/actions/teacher";

const initialState: TeacherNoteState = {
  status: "idle"
};

export function TeacherNoteForm({ studentId }: { studentId: string }) {
  const [state, formAction, isPending] = useActionState(createTeacherNoteAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="space-y-1.5">
        <span className="text-sm font-semibold text-slate-700">Nova observação</span>
        <Input name="note" placeholder="Registrar observação de acompanhamento..." required />
      </label>
      {state.message ? (
        <p className={state.status === "error" ? "text-sm text-red-700" : "text-sm text-violet-700"}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar observação"}
      </Button>
    </form>
  );
}
