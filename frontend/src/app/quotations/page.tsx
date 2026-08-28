'use client';

import React, { useEffect, useState } from 'react';
import { FilePlus, ArrowRight, CheckCircle2, XCircle, Send, Clock, Plus, Trash2, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';

export default function QuotationsPage() {
  const [me, setMe] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Quotation Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<any[]>([{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      const qRes = await fetchApi('/quotations');
      setQuotations(qRes);
      const cRes = await fetchApi('/customers');
      setCustomers(cRes);
      if (cRes.length > 0) setCustomerId(cRes[0].id);
      const pRes = await fetchApi('/products');
      setProducts(pRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const addItemRow = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleProductSelect = (idx: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    const updated = [...items];
    if (prod) {
      updated[idx] = {
        product_id: prod.id,
        product_name: prod.name,
        quantity: 1,
        unit_price: prod.selling_price,
      };
    } else {
      updated[idx] = { product_id: '', product_name: '', quantity: 1, unit_price: 0 };
    }
    setItems(updated);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          validity_date: validityDate,
          notes,
          discount: Number(discount),
          tax_rate: Number(taxRate),
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
    } catch (err: any) {
      alert(err.message || 'Quotation creation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (quotationId: string, newStatus: string) => {
    try {
      await fetchApi(`/quotations/${quotationId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleConvertToOrder = async (quotationId: string) => {
    try {
      const order = await fetchApi(`/quotations/${quotationId}/convert-to-order`, {
        method: 'POST',
      });
      alert(`🎉 Quotation converted into Order ${order.order_number}!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Conversion failed');
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Quotations</h1>
              <p className="text-xs text-zinc-500">Draft, present, accept & convert estimates to furniture orders</p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
            >
              <FilePlus className="w-4 h-4" />
              <span>Create New Quotation</span>
            </button>
          </div>

          {/* Quotations List */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-3.5">Quotation #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Total (₹)</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Validity</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm font-medium">
                  {quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-zinc-50/80 transition">
                      <td className="px-6 py-4 font-black text-black">{q.quotation_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-black">{q.customer_name}</div>
                        <div className="text-xs text-zinc-500">{q.customer_phone}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-black">
                        ₹{q.total_amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={q.status} type="quotation" />
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-600 font-medium">
                        {q.validity_date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {q.status === 'draft' && (
                            <button
                              onClick={() => handleStatusUpdate(q.id, 'sent')}
                              className="text-xs font-bold uppercase tracking-wider bg-zinc-100 text-black hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition"
                            >
                              Mark Sent
                            </button>
                          )}
                          {q.status === 'sent' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(q.id, 'accepted')}
                                className="text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg transition"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(q.id, 'rejected')}
                                className="text-xs font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 hover:bg-zinc-200 px-2.5 py-1.5 rounded-lg transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {(q.status === 'accepted' || q.status === 'sent') && (
                            <button
                              onClick={() => handleConvertToOrder(q.id)}
                              className="inline-flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                            >
                              <span>Convert to Order</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {quotations.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-medium">
                        No quotations created yet. Click "Create New Quotation" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Create Quotation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-zinc-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
              <h3 className="font-black text-lg text-black uppercase tracking-tight">Create New Quotation</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Select Customer *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Validity Date
                  </label>
                  <input
                    type="date"
                    value={validityDate}
                    onChange={(e) => setValidityDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Quotation Line Items *
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                      <select
                        value={row.product_id}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-medium text-black"
                      >
                        <option value="">Custom Item / Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.selling_price})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Item Description"
                        value={row.product_name}
                        onChange={(e) => {
                          const u = [...items];
                          u[idx].product_name = e.target.value;
                          setItems(u);
                        }}
                        className="w-40 px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-black font-medium"
                      />

                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => {
                          const u = [...items];
                          u[idx].quantity = Number(e.target.value);
                          setItems(u);
                        }}
                        className="w-16 px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-center font-bold text-black"
                      />

                      <input
                        type="number"
                        placeholder="Rate ₹"
                        value={row.unit_price}
                        onChange={(e) => {
                          const u = [...items];
                          u[idx].unit_price = Number(e.target.value);
                          setItems(u);
                        }}
                        className="w-24 px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-right font-bold text-black"
                      />

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 text-zinc-400 hover:text-black"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    GST Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black"
                  />
                </div>
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
                  className="w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md"
                >
                  {saving ? 'Creating...' : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
