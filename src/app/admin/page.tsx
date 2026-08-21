import { AdminPanel } from "@/components/admin/admin-panel";
import { requireRole } from "@/lib/auth/session";
import { getAdminOverview } from "@/server/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireRole(["ADMIN"]);
  const overview = await getAdminOverview();

  return <AdminPanel overview={overview} adminId={admin.id} adminName={admin.name} />;
}
