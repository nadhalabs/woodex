'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Truck,
  AlertTriangle,
  ArrowUpRight,
  Package,
  ChevronRight,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userRes = await fetchApi('/auth/me');
        setMe(userRes);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center text-zinc-500 font-medium tracking-wider text-xs uppercase">
        Loading WOODEX Dashboard...
      </div>
    );
  }

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
          {/* Welcome Banner */}
          <div className="bg-black rounded-2xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-zinc-800">
            <div>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                {me?.business?.plan === 'standard' ? 'WOODEX Standard Business Edition' : 'WOODEX Lite Store Edition'}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                Welcome back, {me?.user?.name}!
              </h1>
              <p className="text-zinc-400 text-sm mt-1 font-normal">
                Here is your store daily operational overview for <span className="font-semibold text-white">{me?.business?.name}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/orders"
                className="bg-white hover:bg-zinc-200 text-black font-extrabold px-5 py-2.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Manage Orders</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Today's Sales */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-zinc-400 transition">
              <div className="flex items-center justify-between text-zinc-500 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Today's Sales</span>
                <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-black">
                ₹{(data?.today_sales || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Direct completed sales today</p>
            </div>

            {/* Active Orders */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-zinc-400 transition">
              <div className="flex items-center justify-between text-zinc-500 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Active Orders</span>
                <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-black">
                {data?.active_orders_count || 0}
              </div>
              <p className="text-xs text-zinc-500 mt-1">In progress & ready for delivery</p>
            </div>

            {/* Pending Payments */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-zinc-400 transition">
              <div className="flex items-center justify-between text-zinc-500 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Pending Payments</span>
                <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-black">
                ₹{(data?.pending_payments || 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Outstanding customer balance</p>
            </div>

            {/* Upcoming Deliveries */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-zinc-400 transition">
              <div className="flex items-center justify-between text-zinc-500 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Upcoming Deliveries</span>
                <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-black">
                {data?.upcoming_deliveries_count || 0}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Scheduled or out for delivery</p>
            </div>
          </div>

          {/* Standard Additional Metrics (Monthly Revenue, Gross Profit Estimate, Valuation) */}
          {isStandard && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-md border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  Monthly Revenue
                </span>
                <div className="text-3xl font-black">
                  ₹{(data?.monthly_revenue || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  {data?.orders_this_month || 0} orders booked this month
                </p>
              </div>

              <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-md border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  Estimated Gross Profit
                </span>
                <div className="text-3xl font-black text-white">
                  ₹{(data?.estimated_gross_profit || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Revenue minus product cost & monthly expenses
                </p>
              </div>

              <div className="bg-zinc-950 text-white rounded-2xl p-6 shadow-md border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  Stock Valuation
                </span>
                <div className="text-3xl font-black text-white">
                  ₹{(data?.stock_valuation || 0).toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  Total retail value of current showroom inventory
                </p>
              </div>
            </div>
          )}

          {/* Recent Orders & Low Stock Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Orders Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden flex flex-col">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-950 text-lg">Recent Orders</h3>
                  <p className="text-xs text-zinc-500">Latest furniture & wood orders</p>
                </div>
                <Link href="/orders" className="text-xs font-bold text-black hover:text-zinc-600 flex items-center gap-1">
                  <span>View All Orders</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-600 text-[11px] font-bold uppercase tracking-wider border-b border-zinc-200">
                      <th className="px-6 py-3">Order #</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Total (₹)</th>
                      <th className="px-6 py-3">Order Status</th>
                      <th className="px-6 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-sm">
                    {(data?.recent_orders || []).map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-zinc-50 transition">
                        <td className="px-6 py-4 font-bold text-zinc-950">{ord.order_number}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-900">{ord.customer_name}</div>
                          <div className="text-xs text-zinc-500">{ord.customer_phone}</div>
                        </td>
                        <td className="px-6 py-4 font-black text-zinc-950">
                          ₹{ord.total_amount?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={ord.order_status} type="order" />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={ord.payment_status} type="payment" />
                        </td>
                      </tr>
                    ))}
                    {(!data?.recent_orders || data.recent_orders.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                          No recent orders found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-950 text-lg">Low Stock Alerts</h3>
                    <p className="text-xs text-zinc-500">Products near threshold</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {(data?.low_stock_products || []).map((prod: any) => (
                    <div
                      key={prod.id}
                      className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-zinc-950 text-sm">{prod.name}</div>
                        <div className="text-xs text-zinc-500">Category: {prod.category}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block bg-black text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                          {prod.current_stock} left
                        </span>
                        <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">Min: {prod.low_stock_level}</div>
                      </div>
                    </div>
                  ))}

                  {(!data?.low_stock_products || data.low_stock_products.length === 0) && (
                    <p className="text-sm text-zinc-500 italic text-center py-6">
                      All product inventory levels are healthy!
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 mt-6">
                <Link
                  href="/products"
                  className="w-full inline-flex justify-center items-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold py-2.5 rounded-xl transition text-xs uppercase tracking-wider"
                >
                  <Package className="w-4 h-4" />
                  <span>View Product Inventory</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
