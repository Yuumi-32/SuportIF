import type { UserRole } from "@prisma/client";

import { SettingsView } from "@/components/settings/settings-view";
import { parseAppearance } from "@/lib/appearance/settings";
import { requireUser } from "@/lib/auth/session";
import { getExplanationModeLabel, toExplanationMode } from "@/lib/learning/explanation-modes";
import { toSettingsSection } from "@/lib/settings/sections";
import { getSettingsOverview } from "@/server/queries/settings";

export const dynamic = "force-dynamic";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador",
  TEACHER: "Tutor",
  STUDENT: "Aluno"
};

function formatDate(date: Date | null) {
  return date ? date.toLocaleDateString("pt-BR") : "sem registro";
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ secao?: string | string[] }>;
}) {
  const user = await requireUser();
  const { secao } = await searchParams;
  const overview = await getSettingsOverview(user.id);
  const preferredExplanationMode = toExplanationMode(user.profile?.preferredExplanationMode);

  return (
    <SettingsView
      initialSection={toSettingsSection(secao)}
      profile={{
        name: user.name,
        email: user.email,
        bio: user.profile?.bio ?? ""
      }}
      preferredExplanationMode={preferredExplanationMode}
      appearance={parseAppearance(user.profile?.appearance)}
      activeSessionCount={overview.activeSessionCount}
      account={{
        name: user.name,
        email: user.email,
        roleLabel: roleLabels[user.role],
        memberSince: formatDate(user.createdAt),
        lastLogin: formatDate(user.lastLoginAt),
        explanationModeLabel: getExplanationModeLabel(preferredExplanationMode),
        isStudent: user.role === "STUDENT",
        progress: {
          level: user.profile?.level ?? 1,
          totalXp: user.profile?.totalXp ?? 0,
          streak: user.profile?.streak ?? 0
        },
        overview: {
          completedMissionCount: overview.completedMissionCount,
          noteCount: overview.noteCount,
          eventCount: overview.eventCount
        }
      }}
    />
  );
}
