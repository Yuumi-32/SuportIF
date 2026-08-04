import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SettingsActionState } from "@/server/actions/settings";

export function SettingsFeedback({ state }: { state: SettingsActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  const isError = state.status === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      {state.message}
    </p>
  );
}
