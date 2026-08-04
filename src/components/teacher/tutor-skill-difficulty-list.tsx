import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/dashboard/progress-bar";

type TutorSkillDifficultyListProps = {
  items: Array<{
    key: string;
    label: string;
    wrongCount: number;
    totalCount: number;
    errorRate: number;
  }>;
};

export function TutorSkillDifficultyList({ items }: TutorSkillDifficultyListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assuntos com mais erro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.key} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-950">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.wrongCount} erros em {item.totalCount} respostas
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-700">{item.errorRate}%</p>
              </div>
              <ProgressBar value={item.errorRate} className="mt-3" />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">Ainda não há erros suficientes para destacar dificuldades.</p>
        )}
      </CardContent>
    </Card>
  );
}
