import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeacherNoteListProps = {
  notes: Array<{
    id: string;
    note: string;
    createdAt: Date;
    teacher: {
      name: string;
    };
  }>;
};

export function TeacherNoteList({ notes }: TeacherNoteListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Observações do tutor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div key={note.id} className="rounded-md border bg-white p-3 text-sm leading-6">
              <p className="text-slate-800">{note.note}</p>
              <p className="mt-2 text-xs text-slate-500">
                {note.teacher.name} · {note.createdAt.toLocaleString("pt-BR")}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">Nenhuma observação registrada para este aluno.</p>
        )}
      </CardContent>
    </Card>
  );
}
