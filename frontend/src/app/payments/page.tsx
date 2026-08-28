'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Calendar, CheckCircle, Search, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function PaymentsPage() {
  const [me, setMe] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetchApi('/auth/me');
        setMe(meRes);
        const pRes = await fetchApi('/payments');
        setPayments(pRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex">
      <Sidebar businessPlan={me?.business?.plan} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={me?.user?.name}
          userRole={me?.user?.role}
          businessName={me?.business?.name}
          businessPlan={me?.business?.plan}
        />

        <main className="p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Payment Ledger</h1>
              <p className="text-xs text-zinc-500">Record of advance & balance collections across all transactions</p>
            </div>

            <div className="bg-black text-white px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-black flex items-center gap-2 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Total Collections: ₹{totalCollected.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-3.5">Payment Date</th>
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Amount (₹)</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Ref / Txn ID</th>
                    <th className="px-6 py-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm font-medium">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-black">{p.payment_date}</td>
                      <td className="px-6 py-4 font-mono font-bold text-zinc-700">{p.order_id?.substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-black text-black">₹{p.amount?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-zinc-100 border border-zinc-300 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-zinc-600">{p.reference_number || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs text-zinc-500 italic">{p.notes || '-'}</td>
                    </tr>
                  ))}

                  {payments.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-medium">
                        No payment records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
