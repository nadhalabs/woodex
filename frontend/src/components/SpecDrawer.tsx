'use client';

import React from 'react';
import { X, Ruler, Trees, Palette, Sparkles, FileText } from 'lucide-react';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface SpecDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  specs: any;
  orderNumber?: string;
}

export function SpecDrawer({ isOpen, onClose, specs, orderNumber }: SpecDrawerProps) {
  const dialogRef = useDialogAccessibility<HTMLDivElement>(isOpen, onClose);
  if (!isOpen) return null;

  const data = specs || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="spec-drawer-title" tabIndex={-1} className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-zinc-300">
        <div>
          {/* Header */}
          <div className="p-6 bg-black text-white flex items-center justify-between border-b border-zinc-800">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">Custom Furniture Order</span>
              <h3 id="spec-drawer-title" className="text-xl font-black text-white tracking-tight">Custom Specs — {orderNumber || 'Order'}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close custom specifications"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Specs Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-black shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                These custom specifications guide carpenters, polishers, and delivery teams during furniture crafting.
              </p>
            </div>

            <div className="space-y-4">
              {/* Dimensions */}
              <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <Ruler className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Dimensions</span>
                  <div className="text-sm font-bold text-black mt-0.5">
                    {data.dimensions || 'Standard Factory Dimensions'}
                  </div>
                </div>
              </div>

              {/* Wood Type */}
              <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <Trees className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Wood Material / Timber</span>
                  <div className="text-sm font-bold text-black mt-0.5">
                    {data.wood_type || 'Seasoned Teak Wood'}
                  </div>
                </div>
              </div>

              {/* Color & Polish */}
              <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <Palette className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Color & Polish Finish</span>
                  <div className="text-sm font-bold text-black mt-0.5">
                    {data.color || data.finish || 'Walnut Polish'}
                  </div>
                </div>
              </div>

              {/* Fabric Upholstery */}
              {data.fabric && (
                <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <Sparkles className="w-5 h-5 text-black shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fabric / Upholstery</span>
                    <div className="text-sm font-bold text-black mt-0.5">
                      {data.fabric}
                    </div>
                  </div>
                </div>
              )}

              {/* Design Notes */}
              <div className="flex items-start gap-3 p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                <FileText className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Carpenter Instructions & Notes</span>
                  <div className="text-sm text-zinc-800 mt-0.5 whitespace-pre-wrap font-medium">
                    {data.design_notes || data.notes || 'No extra custom instructions.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 bg-zinc-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-black text-white font-extrabold py-2.5 rounded-xl hover:bg-zinc-800 transition text-xs uppercase tracking-wider"
          >
            Close Spec Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
