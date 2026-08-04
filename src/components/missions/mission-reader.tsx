import { AlertCircle, BookOpenCheck, CheckCircle2, Clock, Flame, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExerciseCard } from "@/components/exercises/exercise-card";
import { ExplanationTabs } from "@/components/missions/explanation-tabs";
import { getExplanationSectionId } from "@/lib/learning/explanation-modes";
import { getAttentionPointText, getMissionDifficultyLabel } from "@/lib/learning/presentation";

type MissionReaderProps = {
  /** Preferência de explicação do aluno, definida em Configuração. */
  preferredExplanationMode?: string | null;
  mission: {
    id: string;
    title: string;
    objective: string;
    quickExplanation: string;
    detailedExplanation: string;
    analogy: string;
    practicalExample: string;
    guidedExercisePrompt: string;
    challengePrompt: string;
    summary: string;
    attentionPoints: string[];
    difficulty: string;
    xpReward: number;
    estimatedMinutes: number;
    exercises: Array<{
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
    }>;
  };
};

export function MissionReader({ mission, preferredExplanationMode }: MissionReaderProps) {
  return (
    <div className="space-y-6">
      <Card className="border-violet-100 bg-white">
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge>{getMissionDifficultyLabel(mission.difficulty)}</Badge>
            <Badge variant="secondary" className="gap-1 bg-violet-50 text-violet-800">
              <Flame className="h-3.5 w-3.5" /> {mission.xpReward} XP
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3.5 w-3.5" /> {mission.estimatedMinutes} min
            </Badge>
          </div>
          <CardTitle className="pt-2 text-3xl font-black leading-tight">{mission.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-900">
              <Target className="h-4 w-4" /> Objetivo da missão
            </p>
            <p className="mt-2 text-base leading-7 text-violet-950">{mission.objective}</p>
          </div>
        </CardContent>
      </Card>

      <ExplanationTabs
        initialSectionId={getExplanationSectionId(preferredExplanationMode)}
        sections={[
          {
            id: "rapida",
            label: "Rápida",
            content: <p>{mission.quickExplanation}</p>
          },
          {
            id: "mastigada",
            label: "Mastigada",
            content: <p>{mission.detailedExplanation}</p>
          },
          {
            id: "analogia",
            label: "Analogia",
            content: <p>{mission.analogy}</p>
          },
          {
            id: "exemplo",
            label: "Exemplo",
            content: <p>{mission.practicalExample}</p>
          },
          {
            id: "resumo",
            label: "Resumo",
            content: <p>{mission.summary}</p>
          }
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-violet-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpenCheck className="h-5 w-5 text-violet-700" /> Exercício guiado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">{mission.guidedExercisePrompt}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-amber-700" /> Desafio sem ajuda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-slate-700">{mission.challengePrompt}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-slate-500" /> Pontos de atenção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm leading-6 text-slate-700">
            {mission.attentionPoints.map((point) => (
              <li key={point} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                {getAttentionPointText(point)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-950">Exercícios da missão</h2>
        {mission.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            id={exercise.id}
            order={exercise.order}
            prompt={exercise.prompt}
            explanation={exercise.explanation}
            options={exercise.options}
            attempts={exercise.attempts}
          />
        ))}
      </div>
    </div>
  );
}
