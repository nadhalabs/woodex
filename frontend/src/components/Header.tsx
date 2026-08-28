'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Store, ChevronRight, User, Maximize2, Minimize2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface HeaderProps {
  userName?: string;
  userRole?: string;
  businessName?: string;
  businessPlan?: string;
}

export function Header({ userName, userRole, businessName, businessPlan }: HeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('woodex_token');
    window.location.href = '/login';
  };

  const handleSwitchStore = async (email: string) => {
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: 'password123' }),
      });
      if (res.access_token) {
        localStorage.setItem('woodex_token', res.access_token);
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      alert(err.message || 'Store switch failed');
    }
  };

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs no-print">
      {/* Active Business Store Info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
          <Store className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-zinc-950 text-base sm:text-lg leading-tight tracking-tight">{businessName || 'WOODEX Store'}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
              businessPlan === 'standard' ? 'bg-black text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-900 border border-zinc-300'
            }`}>
              {businessPlan || 'lite'} Edition
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium">Multi-Tenant Isolated Business Space</p>
        </div>
      </div>

      {/* Demo Quick Store Switcher, Fullscreen Enlarge & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Switcher dropdown / buttons */}
        <div className="hidden lg:flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          <span className="text-xs font-semibold text-zinc-500 px-2 tracking-tight">Demo Stores:</span>
          <button
            onClick={() => handleSwitchStore('owner@oakwood.com')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
              businessName?.includes('Oakwood')
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-200/60'
            }`}
          >
            Oakwood (Lite)
          </button>
          <button
            onClick={() => handleSwitchStore('owner@timbercraft.com')}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
              businessName?.includes('TimberCraft')
                ? 'bg-black text-white shadow-xs'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-200/60'
            }`}
          >
            TimberCraft (Standard)
          </button>
        </div>

        {/* Enlarge Screen / Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen mode' : 'Enlarge screen / Fullscreen mode'}
          className="p-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-zinc-200 shadow-2xs"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 text-black" />
              <span className="hidden md:inline text-[11px] font-bold">Shrink</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-zinc-800" />
              <span className="hidden md:inline text-[11px] font-bold">Enlarge</span>
            </>
          )}
        </button>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-200">
          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-zinc-900 leading-tight">{userName || 'User'}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{userRole || 'Owner'}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
