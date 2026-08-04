import type { EngagementSeverity, EngagementSignalType } from "@prisma/client";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { StudentRiskBadge } from "@/components/teacher/student-risk-badge";

type EngagementSignalCardProps = {
  id: string;
  type: EngagementSignalType;
  severity: EngagementSeverity;
  message: string;
  suggestedAction: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
  };
};

export function EngagementSignalCard({
  type,
  severity,
  message,
  suggestedAction,
  createdAt,
  user
}: EngagementSignalCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StudentRiskBadge severity={severity} />
          <span className="text-xs font-semibold text-slate-500">{type}</span>
        </div>
        <Link
          href={`/tutor/alunos/${user.id}`}
          className="mt-3 block font-semibold text-slate-950 hover:text-violet-800"
        >
          {user.name}
        </Link>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <p className="mt-2 rounded-md bg-violet-50 px-3 py-2 text-sm text-violet-950">
          {suggestedAction}
        </p>
        <p className="mt-2 text-xs text-slate-500">{createdAt.toLocaleDateString("pt-BR")}</p>
      </CardContent>
    </Card>
  );
}
