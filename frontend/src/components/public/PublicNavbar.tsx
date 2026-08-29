'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Features', href: '/#features' },
  { name: 'Workflow', href: '/#workflow' },
  { name: 'FAQ', href: '/faq' },
];

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b0a]/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12 xl:px-20">
        <Link href="/" className="group flex min-h-11 items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]" aria-label="Woodex home">
          <span className="grid h-10 w-10 place-items-center bg-[#f4f1eb] text-sm font-black tracking-[-0.04em] text-[#11110f] transition-colors group-hover:bg-[#d6b48d]">WX</span>
          <span>
            <span className="block text-base font-black tracking-[0.16em] text-white">WOODEX</span>
            <span className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-[#8f8a82]">Furniture business software</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.name} href={link.href} className="text-sm font-medium text-[#aaa69f] transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]">
              {link.name}
            </Link>
          ))}
        </nav>

        <Link href="/login" className="group hidden min-h-11 items-center gap-2 border border-white/20 px-5 text-sm font-semibold text-[#f4f1eb] transition-colors hover:border-[#d6b48d] hover:bg-[#d6b48d] hover:text-[#11110f] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a] md:inline-flex">
          Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <button type="button" className="grid h-11 w-11 place-items-center border border-white/15 text-[#e2ded7] transition-colors hover:border-white/35 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div id="mobile-navigation" className="border-t border-white/10 bg-[#0b0b0a] px-5 pb-6 pt-3 md:hidden">
          <nav className="mx-auto flex max-w-[1440px] flex-col" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} onClick={() => setMobileMenuOpen(false)} className="border-b border-white/10 py-4 text-base font-medium text-[#d7d2ca] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                {link.name}
              </Link>
            ))}
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 bg-[#f4f1eb] px-5 text-sm font-bold text-[#11110f] hover:bg-[#d6b48d] focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
