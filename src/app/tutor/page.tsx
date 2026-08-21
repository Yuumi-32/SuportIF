import { TeacherPanel } from "@/components/teacher/teacher-panel";
import { requireRole } from "@/lib/auth/session";
import { getTeacherPanel } from "@/server/queries/tutor";

export const dynamic = "force-dynamic";

export default async function TutorPage() {
  const user = await requireRole(["TEACHER"]);
  const panel = await getTeacherPanel(user.id);

  return <TeacherPanel panel={panel} teacherName={user.name} />;
}
