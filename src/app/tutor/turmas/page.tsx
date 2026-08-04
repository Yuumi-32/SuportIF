import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { ClassGroupCard } from "@/components/teacher/class-group-card";
import { requireRole } from "@/lib/auth/session";
import { getTutorClasses } from "@/server/queries/tutor";

export const dynamic = "force-dynamic";

export default async function TutorClassesPage() {
  const user = await requireRole(["TEACHER"]);
  const classes = await getTutorClasses(user.id);

  return (
    <div className="space-y-6">
      <section>
        <Badge variant="secondary">Turmas</Badge>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">Minhas turmas</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Compare progresso, revisões atrasadas e sinais de atenção por turma.
        </p>
      </section>

      {classes.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {classes.map((item) => (
            <ClassGroupCard
              key={item.classGroup.id}
              id={item.classGroup.id}
              name={item.classGroup.name}
              description={item.classGroup.description}
              studentCount={item.studentCount}
              averageProgress={item.averageProgress}
              attentionSignals={item.attentionSignals}
              highRiskSignals={item.highRiskSignals}
              overdueReviews={item.overdueReviews}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          title="Nenhuma turma vinculada"
          description="Quando o professor for vinculado a uma turma, ela aparecerá aqui."
        />
      )}
    </div>
  );
}
