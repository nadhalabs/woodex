'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Building2, Package, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { UpgradeBanner } from '@/components/UpgradeBanner';

export default function PurchasesPage() {
  const [me, setMe] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Purchase Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      if (meRes?.business?.plan === 'standard') {
        const poRes = await fetchApi('/purchases');
        setPurchases(poRes);
        const supRes = await fetchApi('/suppliers');
        setSuppliers(supRes);
        if (supRes.length > 0) setSupplierId(supRes[0].id);
        const prodRes = await fetchApi('/products');
        setProducts(prodRes);
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

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supplierId,
          purchase_date: purchaseDate,
          tax_amount: Number(taxAmount),
          notes,
          items: items.map((i) => ({
            product_id: i.product_id || null,
            product_name: i.product_name,
            quantity: Number(i.quantity),
            unit_price: Number(i.unit_price),
          })),
        }),
      });
      setIsAddModalOpen(false);
      loadData();
      showSuccess('Purchase recorded successfully.');
    } catch (err: any) {
      showError(err, 'Purchase creation failed.');
    } finally {
      setSaving(false);
    }
  };

  const isStandard = me?.business?.plan === 'standard';
  const canManagePurchases = me?.user?.role === 'owner' || me?.user?.role === 'manager';

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Purchase Orders</h1>
              <p className="text-xs text-zinc-500">Record material purchases & auto-increment received inventory</p>
            </div>

            {isStandard && canManagePurchases && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </button>
            )}
          </div>

          {!isStandard && (
            <UpgradeBanner
              featureName="Purchase Order Management"
              description="Create vendor purchase orders, track raw timber procurement costs, and auto-increment stock upon delivery."
              canUpgrade={me?.user?.role === 'owner'}
            />
          )}

          {isStandard && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                      <th className="px-6 py-3.5">PO #</th>
                      <th className="px-6 py-3.5">Supplier</th>
                      <th className="px-6 py-3.5">Purchase Date</th>
                      <th className="px-6 py-3.5">Total (₹)</th>
                      <th className="px-6 py-3.5">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm font-medium">
                    {purchases.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/80 transition">
                        <td className="px-6 py-4 font-black text-black">{p.purchase_number}</td>
                        <td className="px-6 py-4 font-bold text-zinc-900">{p.supplier_name}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">{p.purchase_date}</td>
                        <td className="px-6 py-4 font-black text-black">₹{p.total_amount?.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-4">
                          <span className="inline-block bg-zinc-100 border border-zinc-300 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}

                    {purchases.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">
                          No purchase orders recorded yet.
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

      {/* Add Purchase Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Create Purchase Order</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Select Supplier *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Product Item Received *
                </label>
                <div className="flex gap-2">
                  <select
                    value={items[0]?.product_id}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      if (prod) {
                        setItems([{ product_id: prod.id, product_name: prod.name, quantity: 1, unit_price: prod.cost_price }]);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black"
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={items[0]?.quantity}
                    onChange={(e) => setItems([{ ...items[0], quantity: Number(e.target.value) }])}
                    className="w-20 px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-center text-black"
                  />
                  <input
                    type="number"
                    placeholder="Cost ₹"
                    value={items[0]?.unit_price}
                    onChange={(e) => setItems([{ ...items[0], unit_price: Number(e.target.value) }])}
                    className="w-28 px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-right text-black"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
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
                  {saving ? 'Creating...' : 'Receive Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
