import { AdminSectionCard } from "@/components/admin/admin-section-card";

export function AdminFormShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AdminSectionCard title={title} description={description}>
      <div className="space-y-5">{children}</div>
    </AdminSectionCard>
  );
}
