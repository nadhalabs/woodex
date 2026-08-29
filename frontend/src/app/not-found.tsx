import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, HelpCircle } from 'lucide-react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-white selection:text-black flex flex-col justify-between">
      <PublicNavbar />

      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center space-y-6">
          {/* 404 Badge */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-3xl bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">
                404
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
              Page Not Found
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase leading-tight">
              Lost in the showroom?
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed max-w-sm mx-auto">
              The page or resource you are looking for does not exist or may have been relocated.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-widest py-3.5 px-6 rounded-xl shadow-xl transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return Home</span>
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-bold uppercase tracking-widest py-3.5 px-6 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Store className="w-4 h-4" />
              <span>Sign In to Store</span>
            </Link>
          </div>

          <div className="pt-2">
            <Link
              href="/faq"
              className="text-xs text-zinc-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Need help? Read our Frequently Asked Questions</span>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
