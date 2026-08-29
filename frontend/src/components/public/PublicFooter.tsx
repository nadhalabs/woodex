import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-black text-zinc-400 border-t border-zinc-900 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">
          {/* Column 1: Brand & Identity */}
          <div className="space-y-4 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl py-1"
            >
              <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-black text-sm shadow-md group-hover:bg-zinc-200 transition">
                WX
              </div>
              <span className="text-lg font-black tracking-widest text-white uppercase">
                WOODEX
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-zinc-400 font-medium max-w-sm">
              Integrated business and counter operating system designed for furniture showrooms, custom wood ateliers, and timber merchants.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium pt-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Architecture Active</span>
            </div>
          </div>

          {/* Column 2: Core Platform Modules */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200 mb-4">
              Core Modules
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Products & Timber Specs
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Counter POS & Billing
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Custom Quotations
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Order & Production Tracking
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Purchases & Supplier Logs
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Reports & Financial Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Navigation & Resources */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200 mb-4">
              Navigation
            </h3>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <Link href="/" className="hover:text-white transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition">
                  Feature Overview
                </Link>
              </li>
              <li>
                <Link href="/#workflow" className="hover:text-white transition">
                  Store Workflow
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition inline-flex items-center gap-1">
                  <span>Sign In</span>
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Architecture & Trust */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-200 mb-4">
              Store Reliability
            </h3>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-zinc-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Isolated Store Tenants</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400">
                Each store operates within an isolated tenant environment with strict role-based authorization for owners, managers, and staff.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Thermal & A4 Invoice Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <div>
            &copy; {new Date().getFullYear()} WOODEX. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/faq" className="hover:text-white transition">
              FAQ
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
