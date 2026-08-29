'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Plus, Phone, MapPin, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { UpgradeBanner } from '@/components/UpgradeBanner';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

export default function SuppliersPage() {
  const [me, setMe] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Supplier Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const supplierDialogRef = useDialogAccessibility<HTMLDivElement>(isAddModalOpen, () => setIsAddModalOpen(false));

  async function loadData() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      if (meRes?.business?.plan === 'standard') {
        const supRes = await fetchApi('/suppliers');
        setSuppliers(supRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/suppliers', {
        method: 'POST',
        body: JSON.stringify({ name, phone, address, gstin, notes }),
      });
      setIsAddModalOpen(false);
      setName('');
      setPhone('');
      loadData();
      showSuccess('Supplier created successfully.');
    } catch (err: any) {
      showError(err, 'Failed to create supplier.');
    } finally {
      setSaving(false);
    }
  };

  const isStandard = me?.business?.plan === 'standard';
  const canManageSuppliers = me?.user?.role === 'owner' || me?.user?.role === 'manager';

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

        <main className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Supplier Directory</h1>
              <p className="text-xs text-zinc-500">Manage timber mills, hardware vendors & material suppliers</p>
            </div>

            {isStandard && canManageSuppliers && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Supplier</span>
              </button>
            )}
          </div>

          {!isStandard && (
            <UpgradeBanner
              featureName="Supplier Management"
              description="Keep track of timber mills, wood raw material suppliers, vendor GSTINs, and procurement history."
              canUpgrade={me?.user?.role === 'owner'}
            />
          )}

          {isStandard && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-black hover:shadow-md transition space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-zinc-100 text-black">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-black text-lg leading-snug">{s.name}</h3>
                      {s.gstin && <p className="text-xs text-zinc-500 font-mono font-bold">GSTIN: {s.gstin}</p>}
                    </div>
                  </div>

                  {s.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-medium">
                      <Phone className="w-3.5 h-3.5 text-black" />
                      <span>{s.phone}</span>
                    </div>
                  )}

                  {s.address && (
                    <div className="flex items-start gap-1.5 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{s.address}</span>
                    </div>
                  )}
                </div>
              ))}

              {suppliers.length === 0 && !loading && (
                <div className="col-span-full bg-white rounded-2xl p-12 text-center text-zinc-400 border border-zinc-200 font-medium">
                  No suppliers added yet.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div ref={supplierDialogRef} role="dialog" aria-modal="true" aria-labelledby="supplier-dialog-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 border border-zinc-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 id="supplier-dialog-title" className="font-black text-black text-lg uppercase tracking-tight">Add New Supplier</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} aria-label="Close add supplier dialog" className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label htmlFor="supplier-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  id="supplier-name"
                  data-autofocus
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. National Timber & Ply Co."
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="supplier-phone" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="supplier-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="supplier-gstin" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Vendor GSTIN
                </label>
                <input
                  id="supplier-gstin"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="27SUPPLIER1234A"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-mono font-bold text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label htmlFor="supplier-address" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Address
                </label>
                <textarea
                  id="supplier-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
