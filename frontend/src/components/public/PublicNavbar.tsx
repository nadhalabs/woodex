'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X, Store } from 'lucide-react';

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Features', href: '/#features' },
    { name: 'Workflow', href: '/#workflow' },
    { name: 'FAQ', href: '/faq' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-zinc-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl py-1 px-1.5"
            aria-label="WOODEX Home"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-base shadow-md group-hover:bg-zinc-200 transition">
              WX
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-widest text-white uppercase leading-tight">
                WOODEX
              </span>
              <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">
                Furniture & Timber OS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-semibold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg px-2 py-1 ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA Action */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-black tracking-widest uppercase py-2.5 px-5 rounded-xl shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white active:scale-[0.98]"
            >
              <Store className="w-4 h-4" />
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 transition"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-zinc-900">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-black tracking-widest uppercase py-3 px-4 rounded-xl transition shadow-lg"
            >
              <Store className="w-4 h-4" />
              <span>Sign In to Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
