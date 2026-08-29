'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Store, User, Maximize2, Minimize2 } from 'lucide-react';
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

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 pl-16 pr-3 sm:px-8 py-3.5 flex items-center justify-between gap-2 shadow-2xs no-print">
      {/* Active Business Store Info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
          <Store className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-zinc-950 text-sm sm:text-lg leading-tight tracking-tight truncate">{businessName || 'WOODEX Store'}</h2>
            <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
              businessPlan === 'standard' ? 'bg-black text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-900 border border-zinc-300'
            }`}>
              {businessPlan || 'lite'} Edition
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-zinc-400 font-medium">Multi-Tenant Isolated Business Space</p>
        </div>
      </div>

      {/* Fullscreen Enlarge & User Profile */}
      <div className="flex items-center gap-3">
        {/* Enlarge Screen / Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen mode' : 'Enlarge screen / Fullscreen mode'}
          aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
          className="hidden sm:flex p-2 text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-xl transition cursor-pointer items-center gap-1.5 text-xs font-semibold border border-zinc-200 shadow-2xs"
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
        <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-zinc-200">
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
          type="button"
          onClick={handleLogout}
          title="Sign Out"
          aria-label="Sign out"
          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
