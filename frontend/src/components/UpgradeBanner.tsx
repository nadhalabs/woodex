'use client';

import React from 'react';
import { Sparkles, Check, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface UpgradeBannerProps {
  featureName: string;
  description: string;
  onPlanUpgraded?: () => void;
}

export function UpgradeBanner({ featureName, description, onPlanUpgraded }: UpgradeBannerProps) {
  const [upgrading, setUpgrading] = React.useState(false);

  const handleQuickUpgrade = async () => {
    try {
      setUpgrading(true);
      await fetchApi('/business', {
        method: 'PUT',
        body: JSON.stringify({ plan: 'standard' }),
      });
      if (onPlanUpgraded) {
        onPlanUpgraded();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="bg-black text-white rounded-2xl p-8 sm:p-10 shadow-2xl max-w-4xl mx-auto my-12 border border-zinc-800">
      <div className="flex items-center gap-2.5 text-zinc-400 font-bold mb-3 text-xs tracking-widest uppercase">
        <Sparkles className="w-4 h-4 text-white" />
        <span>WOODEX Standard Edition Feature</span>
      </div>
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
        Unlock {featureName}
      </h2>
      <p className="text-zinc-400 text-base sm:text-lg mb-8 leading-relaxed font-normal">
        {description}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-zinc-950 p-6 rounded-xl border border-zinc-800/80">
        <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>Supplier Directory & Purchase Orders</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>Product Variants (Teak, Walnut, Fabrics)</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>Inventory Movement & Stock Audit Logs</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-300 text-sm font-medium">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>Staff Management & Custom Specs</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={handleQuickUpgrade}
          disabled={upgrading}
          className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-extrabold px-6 py-3 rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer text-sm"
        >
          {upgrading ? 'Upgrading Store...' : 'Switch / Upgrade to Standard Plan'}
          <ArrowRight className="w-4 h-4" />
        </button>
        <span className="text-zinc-500 text-xs font-medium">
          Instant 1-click toggle for testing. Switch back anytime in Settings.
        </span>
      </div>
    </div>
  );
}
