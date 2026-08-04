import type { EngagementSeverity } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const labels: Record<EngagementSeverity, string> = {
  NORMAL: "Normal",
  ATTENTION: "Atenção",
  HIGH_RISK: "Risco alto"
};

export function StudentRiskBadge({ severity }: { severity: EngagementSeverity }) {
  if (severity === "HIGH_RISK") {
    return <Badge variant="warning">{labels[severity]}</Badge>;
  }

  if (severity === "ATTENTION") {
    return <Badge variant="secondary">{labels[severity]}</Badge>;
  }

  return <Badge variant="outline">{labels[severity]}</Badge>;
}
