import { Badge } from "@/components/ui/badge";

export function AdminStatusBadge({
  active,
  trueLabel,
  falseLabel
}: {
  active: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <Badge
      variant={active ? "secondary" : "outline"}
      className={active ? "bg-violet-50 text-violet-800" : "bg-slate-50 text-slate-600"}
    >
      {active ? trueLabel : falseLabel}
    </Badge>
  );
}
