import Link from "next/link";

import { Badge } from "@/components/ui/badge";

export function AdminPageHeader({
  eyebrow = "Admin",
  title,
  description,
  actionHref,
  actionLabel
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <Badge variant="secondary" className="bg-violet-50 text-violet-800">
          {eyebrow}
        </Badge>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex h-11 items-center justify-center rounded-md bg-violet-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-800"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
