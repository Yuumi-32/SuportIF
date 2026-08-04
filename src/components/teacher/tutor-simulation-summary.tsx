"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TutorSimulationSummaryProps = {
  attempts: Array<{
    id: string;
    score: number;
    correctCount: number;
    wrongCount: number;
    finishedAt: Date | null;
    user: {
      name: string;
    };
    simulation: {
      title: string;
    };
  }>;
};

export function TutorSimulationSummary({ attempts }: TutorSimulationSummaryProps) {
  const chartData = attempts.slice(0, 6).map((attempt) => ({
    name: attempt.user.name.split(" ")[0],
    score: attempt.score
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos simulados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {attempts.length > 0 ? (
          <>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#047857" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {attempts.slice(0, 4).map((attempt) => (
                <div key={attempt.id} className="rounded-md border bg-white p-3 text-sm">
                  <p className="font-semibold text-slate-950">{attempt.user.name}</p>
                  <p className="text-slate-600">
                    {attempt.simulation.title} · {attempt.score}% · {attempt.correctCount} acertos
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Nenhum simulado realizado pelos alunos ainda.</p>
        )}
      </CardContent>
    </Card>
  );
}
