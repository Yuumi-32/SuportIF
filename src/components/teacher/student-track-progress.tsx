import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/dashboard/progress-bar";

type StudentTrackProgressProps = {
  tracks: Array<{
    enrollmentId: string;
    title: string;
    area: string;
    completed: number;
    total: number;
    progressPercent: number;
  }>;
};

export function StudentTrackProgress({ tracks }: StudentTrackProgressProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso por trilha</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <div key={track.enrollmentId} className="rounded-md border bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{track.title}</p>
                  <p className="text-sm text-slate-500">{track.area}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {track.completed}/{track.total}
                </p>
              </div>
              <ProgressBar value={track.progressPercent} />
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">Aluno sem trilhas em andamento.</p>
        )}
      </CardContent>
    </Card>
  );
}
