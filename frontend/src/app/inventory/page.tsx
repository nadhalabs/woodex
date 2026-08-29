'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { UpgradeBanner } from '@/components/UpgradeBanner';

export default function InventoryPage() {
  const [me, setMe] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetchApi('/auth/me');
        setMe(meRes);
        if (meRes?.business?.plan === 'standard') {
          const invRes = await fetchApi('/inventory/movements');
          setMovements(invRes);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isStandard = me?.business?.plan === 'standard';

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex">
      <Sidebar businessPlan={me?.business?.plan} userRole={me?.user?.role} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={me?.user?.name}
          userRole={me?.user?.role}
          businessName={me?.business?.name}
          businessPlan={me?.business?.plan}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Advanced Inventory Audit Trail</h1>
            <p className="text-xs text-zinc-500">Stock movements, sale deductions, purchase intakes & manual adjustments</p>
          </div>

          {!isStandard && (
            <UpgradeBanner
              featureName="Advanced Inventory Movements & Audit Logs"
              description="Complete stock-in, stock-out, sale deduction, supplier intake, and manual inventory adjustment logs."
              canUpgrade={me?.user?.role === 'owner'}
            />
          )}

          {isStandard && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                      <th className="px-6 py-3.5">Timestamp</th>
                      <th className="px-6 py-3.5">Product</th>
                      <th className="px-6 py-3.5">Movement Type</th>
                      <th className="px-6 py-3.5">Change</th>
                      <th className="px-6 py-3.5">Previous → New Stock</th>
                      <th className="px-6 py-3.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm font-medium">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50/80 transition">
                        <td className="px-6 py-4 text-xs text-zinc-500 font-mono">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-black">{m.product_name}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block bg-zinc-100 border border-zinc-300 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                            {m.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black">
                          {m.quantity_change > 0 ? (
                            <span className="text-black">+{m.quantity_change}</span>
                          ) : (
                            <span className="text-zinc-600">{m.quantity_change}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-600">
                          {m.previous_stock} → <span className="font-bold text-black">{m.new_stock}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 italic">{m.notes || '-'}</td>
                      </tr>
                    ))}

                    {movements.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-medium">
                          No inventory movement logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
