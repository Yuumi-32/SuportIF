import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminDashboardCard({
  title,
  value,
  description
}: {
  title: string;
  value: number | string;
  description: string;
}) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-slate-950">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}
