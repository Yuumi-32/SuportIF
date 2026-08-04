import { GradesView } from "@/components/grades/grades-view";
import { requireUser } from "@/lib/auth/session";
import { getStudentGrades } from "@/server/queries/grades";

export const dynamic = "force-dynamic";

export default async function NotasPage() {
  const user = await requireUser();
  const grades = await getStudentGrades(user.id);

  return <GradesView studentName={user.name} data={grades} />;
}
