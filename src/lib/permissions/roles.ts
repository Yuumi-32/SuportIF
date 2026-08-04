import type { UserRole } from "@prisma/client";

export function canAccessRole(userRole: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(userRole);
}
