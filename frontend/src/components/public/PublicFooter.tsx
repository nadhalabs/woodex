import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0b0b0a] text-[#8f8a82]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12 xl:px-20">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center bg-[#f4f1eb] text-[11px] font-black text-[#11110f]">WX</span>
          <div>
            <p className="text-xs font-black tracking-[0.14em] text-[#e5e1da]">WOODEX</p>
            <p className="mt-0.5 text-[11px]">Furniture business software</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs" aria-label="Footer navigation">
          <Link href="/#features" className="inline-flex min-h-11 items-center transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">Features</Link>
          <Link href="/#workflow" className="inline-flex min-h-11 items-center transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">Workflow</Link>
          <Link href="/faq" className="inline-flex min-h-11 items-center transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">FAQ</Link>
          <Link href="/login" className="inline-flex min-h-11 items-center transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">Sign in</Link>
        </nav>

        <p className="text-[11px]">© {new Date().getFullYear()} Woodex</p>
      </div>
    </footer>
  );
}
