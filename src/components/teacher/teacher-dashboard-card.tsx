import { Card, CardContent } from "@/components/ui/card";

type TeacherDashboardCardProps = {
  label: string;
  value: string | number;
  description: string;
};

export function TeacherDashboardCard({ label, value, description }: TeacherDashboardCardProps) {
  return (
    <Card className="border-violet-100">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-violet-800">{value}</p>
        <p className="mt-2 text-sm leading-5 text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}
