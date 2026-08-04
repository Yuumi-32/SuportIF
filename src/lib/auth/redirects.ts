import type { UserRole } from "@prisma/client";

export function getHomePathForRole(role: UserRole) {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "TEACHER") {
    return "/tutor";
  }

  return "/app";
}
