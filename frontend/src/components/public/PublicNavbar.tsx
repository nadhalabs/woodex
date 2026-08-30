'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Features', href: '/#features' },
  { name: 'FAQ', href: '/faq' },
];

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.09] bg-[#0b0b0a]/90 backdrop-blur-lg">
      <div className="mx-auto grid h-[72px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8 lg:px-12 xl:px-20">
        <Link href="/" className="group flex min-h-11 w-fit items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]" aria-label="Woodex home">
          <span className="relative grid h-9 w-9 place-items-center bg-[#f1ede6] text-[12px] font-black tracking-[-0.04em] text-[#11110f] transition-colors group-hover:bg-white">
            WX
            <span className="pointer-events-none absolute inset-[3px] border border-black/10" aria-hidden="true" />
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-black tracking-[0.18em] text-[#f7f4ee]">WOODEX</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.2em] text-[#77736d]">Furniture systems</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.name} href={link.href} className="relative py-2 text-[13px] font-medium tracking-[0.01em] text-[#9d9890] transition-colors after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-[#f1ede6] after:transition-transform hover:text-[#f4f1eb] hover:after:origin-left hover:after:scale-x-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]">
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-self-end md:flex">
          <Link href="/login" className="inline-flex min-h-10 items-center px-4 text-[13px] font-semibold text-[#aaa59d] transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]">
            Sign in
          </Link>
          <Link href="/register" className="group inline-flex min-h-10 items-center justify-center gap-2.5 border border-[#f1ede6]/45 bg-[#f1ede6] px-4 text-[13px] font-bold text-[#141310] transition-colors hover:border-white hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a] active:bg-[#ddd8cf]">
            Create account
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <button ref={menuButtonRef} type="button" className="col-start-3 grid h-10 w-10 cursor-pointer place-items-center justify-self-end border border-white/15 text-[#d8d3cb] transition-colors hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] md:hidden" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="border-t border-white/[0.09] bg-[#0b0b0a] px-5 pb-5 pt-2 md:hidden">
          <nav className="mx-auto flex max-w-[1440px] flex-col" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="border-b border-white/[0.09] py-3.5 text-[15px] font-medium text-[#c9c4bc] transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb]">
                {link.name}
              </Link>
            ))}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="inline-flex min-h-12 items-center justify-center border border-white/15 px-4 text-sm font-semibold text-[#e2ded7] transition-colors hover:border-white/35 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb]">
                Sign in
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="group inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 bg-[#f1ede6] px-4 text-sm font-bold text-[#141310] transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] active:bg-[#ddd8cf]">
                Create account
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
