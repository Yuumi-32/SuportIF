"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";

type UserMenuProps = {
  name: string;
  accountContext: string;
};

const menuItems: Array<{ label: string; href?: string }> = [
  { label: "Conta", href: "/configuracao?secao=conta" },
  { label: "Configuração", href: "/configuracao" },
  { label: "Notas" },
  { label: "Pet", href: "/pet" },
];

const menuItemClassName =
  "block w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900";

export function UserMenu({ name, accountContext }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 lg:rounded-full lg:py-1.5"
      ref={ref}
    >
      <div className="relative min-w-0">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex min-w-0 items-center gap-2.5 text-left text-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white to-violet-200 text-sm font-extrabold text-violet-800 shadow-sm">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-white">{name}</span>
            <span className="block truncate text-xs text-white/70">{accountContext}</span>
          </span>
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {menuItems.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={menuItemClassName}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button key={item.label} className={menuItemClassName}>
                  {item.label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          className="border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white"
        >
          Sair
        </Button>
      </form>
    </div>
  );
}
