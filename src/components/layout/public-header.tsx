import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-violet-100/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-normal text-violet-800">
          SuportIF
        </Link>
        <nav className="flex items-center gap-2" aria-label="Navegação pública">
          <Link
            href="/#trilhas"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
          >
            Trilhas
          </Link>
          <Link
            href="/#open-source"
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
          >
            Código aberto
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-800"
          >
            Entrar na plataforma
          </Link>
        </nav>
      </div>
    </header>
  );
}
