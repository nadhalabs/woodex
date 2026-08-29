'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, CreditCard, ShoppingBag, Layers, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function ReportsPage() {
  const [me, setMe] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetchApi('/auth/me');
        setMe(meRes);
        const dashRes = await fetchApi('/reports/dashboard');
        setData(dashRes);
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

        <main className="p-8 max-w-7xl w-full mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Business Reports & Analytics</h1>
            <p className="text-xs text-zinc-500">Essential sales summaries, outstanding balances & store financial performance</p>
          </div>

          {/* Essential Reports Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Daily Sales Today</span>
              <div className="text-3xl font-black text-black">
                ₹{(data?.today_sales || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-zinc-500 font-medium">Direct sales booked today</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Monthly Sales Volume</span>
              <div className="text-3xl font-black text-black">
                ₹{(data?.monthly_revenue || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-zinc-500 font-medium">{data?.orders_this_month || 0} orders booked this month</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Outstanding Unpaid Balance</span>
              <div className="text-3xl font-black text-black">
                ₹{(data?.pending_payments || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-zinc-500 font-medium">Total customer balance remaining</p>
            </div>
          </div>

          {/* Standard Edition Advanced Reports */}
          {isStandard && (
            <div className="bg-black text-white rounded-2xl p-8 border border-zinc-800 shadow-2xl space-y-6">
              <div className="flex items-center gap-2 text-zinc-300 font-bold text-xs uppercase tracking-wider">
                <BarChart3 className="w-5 h-5 text-white" />
                <span>WOODEX Standard Financial Metrics</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Monthly Showroom Expenses</span>
                  <div className="text-2xl font-black text-white">
                    ₹{(data?.monthly_expenses || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Stock Valuation</span>
                  <div className="text-2xl font-black text-white">
                    ₹{(data?.stock_valuation || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="bg-zinc-900/80 p-5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Estimated Gross Profit</span>
                  <div className="text-2xl font-black text-white">
                    ₹{(data?.estimated_gross_profit || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Top Selling Products List */}
              {data?.top_selling_products && data.top_selling_products.length > 0 && (
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="font-extrabold text-xs text-zinc-400 mb-3 uppercase tracking-widest">Top Selling Showroom Products</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {data.top_selling_products.map((item: any, idx: number) => (
                      <div key={idx} className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{item.product_name}</span>
                        <span className="bg-white text-black font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-md">
                          {item.quantity_sold} sold
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
