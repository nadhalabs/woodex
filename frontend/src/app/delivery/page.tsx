'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Calendar, MapPin, Phone, CheckCircle2, Clock } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';

export default function DeliveryPage() {
  const [me, setMe] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      const oRes = await fetchApi('/orders');
      setOrders(oRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleDeliveryStatusChange = async (orderId: string, newDeliveryStatus: string) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ delivery_status: newDeliveryStatus }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Delivery status update failed');
    }
  };

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
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Delivery Tracking</h1>
            <p className="text-xs text-zinc-500">Manage dispatch dates, delivery addresses & fulfillment updates</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-black hover:shadow-md transition space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-black text-lg">{ord.order_number}</span>
                    <StatusBadge status={ord.delivery_status} type="delivery" />
                  </div>
                  <span className="text-xs font-bold text-zinc-600">{ord.expected_delivery_date || 'Date Unscheduled'}</span>
                </div>

                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 space-y-1.5 text-xs">
                  <div className="font-bold text-black">{ord.customer_name}</div>
                  <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
                    <Phone className="w-3.5 h-3.5 text-black" />
                    <span>{ord.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-zinc-700">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <span className="font-medium">{ord.delivery_address || 'No address specified'}</span>
                  </div>
                  {ord.delivery_notes && (
                    <div className="text-zinc-500 italic pt-1 font-serif">"{ord.delivery_notes}"</div>
                  )}
                </div>

                {/* Delivery Status Quick Buttons */}
                <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Update Stage:</span>
                  <div className="flex items-center gap-1.5">
                    {ord.delivery_status !== 'scheduled' && (
                      <button
                        onClick={() => handleDeliveryStatusChange(ord.id, 'scheduled')}
                        className="text-xs font-bold uppercase tracking-wider bg-zinc-100 text-black hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition border border-zinc-200"
                      >
                        Schedule
                      </button>
                    )}
                    {ord.delivery_status !== 'out_for_delivery' && (
                      <button
                        onClick={() => handleDeliveryStatusChange(ord.id, 'out_for_delivery')}
                        className="text-xs font-bold uppercase tracking-wider bg-zinc-100 text-black hover:bg-zinc-200 px-2.5 py-1 rounded-lg transition border border-zinc-200"
                      >
                        Out for Delivery
                      </button>
                    )}
                    {ord.delivery_status !== 'delivered' && (
                      <button
                        onClick={() => handleDeliveryStatusChange(ord.id, 'delivered')}
                        className="text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-zinc-800 px-2.5 py-1 rounded-lg transition shadow-2xs"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {orders.length === 0 && !loading && (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center text-zinc-400 border border-zinc-200 font-medium">
                No active order deliveries found.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
