'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Store, Sparkles } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@oakwood.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.access_token) {
        localStorage.setItem('woodex_token', data.access_token);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (loginEmail: string) => {
    setEmail(loginEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center font-black mx-auto shadow-2xl mb-4 tracking-tighter text-xl">
          WX
        </div>
        <h1 className="text-3xl font-black text-white tracking-widest uppercase">WOODEX</h1>
        <p className="mt-1.5 text-xs uppercase tracking-widest text-zinc-400 font-semibold">
          Luxury Atelier & Timber Business Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-950 py-8 px-5 shadow-2xl border border-zinc-800/90 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-xl text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm transition"
                  placeholder="name@store.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black font-black py-3 px-4 rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer text-xs uppercase tracking-widest"
            >
              {loading ? 'Signing in...' : 'Sign In to Store'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Login Preset Buttons */}
          <div className="mt-8 pt-6 border-t border-zinc-850">
            <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs tracking-widest uppercase mb-3">
              <Sparkles className="w-4 h-4 text-white" />
              <span>1-Click Demo Accounts</span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('owner@oakwood.com')}
                className="w-full text-left p-3 rounded-xl bg-black hover:bg-zinc-900 border border-zinc-800 transition flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                    Oakwood Furniture Store
                  </div>
                  <div className="text-[11px] text-zinc-400">WOODEX Lite Plan • Owner Account</div>
                </div>
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider">Select</span>
              </button>

              <button
                type="button"
                onClick={() => quickLogin('owner@timbercraft.com')}
                className="w-full text-left p-3 rounded-xl bg-black hover:bg-zinc-900 border border-zinc-800 transition flex items-center justify-between cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                    TimberCraft Luxury Showroom
                  </div>
                  <div className="text-[11px] text-zinc-400">WOODEX Standard Plan • Owner Account</div>
                </div>
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider">Select</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
