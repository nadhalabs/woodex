'use client';

import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Phone, MapPin, FileText, ShoppingBag, CreditCard, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function CustomersPage() {
  const [me, setMe] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      const query = search ? `?q=${encodeURIComponent(search)}` : '';
      const res = await fetchApi(`/customers${query}`);
      setCustomers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, address, notes }),
      });
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setIsAddModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to add customer');
    } finally {
      setSaving(false);
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
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Customer Directory</h1>
              <p className="text-xs text-zinc-500">Manage store clients, phone contacts & outstanding account balances</p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Customer</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Quick search by customer name or phone number..."
              className="block w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-black font-semibold placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm shadow-2xs"
            />
          </div>

          {/* Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {customers.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-black hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-black text-black text-lg leading-snug">{c.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                        <Phone className="w-3.5 h-3.5 text-black" />
                        <span className="font-bold text-zinc-800">{c.phone}</span>
                      </div>
                    </div>
                    {c.pending_balance > 0 ? (
                      <span className="bg-black text-white border border-black text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full">
                        Due: ₹{c.pending_balance.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="bg-zinc-100 text-black border border-zinc-300 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full">
                        Clean Balance
                      </span>
                    )}
                  </div>

                  {c.address && (
                    <div className="flex items-start gap-1.5 text-xs text-zinc-600 mb-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 font-medium">{c.address}</span>
                    </div>
                  )}

                  {c.notes && (
                    <p className="text-xs text-zinc-500 italic mb-4 font-serif">
                      "{c.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{c.total_orders_count || 0} Orders</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">Added {new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {customers.length === 0 && !loading && (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center text-zinc-400 border border-zinc-200 font-medium">
                No customers found matching "{search}".
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
              <h3 className="font-black text-lg text-black uppercase tracking-tight">Add New Customer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, locality, city, pincode..."
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Notes & Preferences
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Prefers teak finish, architect client"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
