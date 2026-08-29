'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Plus, Trash2, Calendar, Tag, DollarSign, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function ExpensesPage() {
  const [me, setMe] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Add Expense Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [category, setCategory] = useState('Transport');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadData() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      const catRes = await fetchApi('/expenses/categories');
      setCategories(catRes);

      const query = selectedCategory ? `?category=${encodeURIComponent(selectedCategory)}` : '';
      const expRes = await fetchApi(`/expenses${query}`);
      setExpenses(expRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetchApi('/expenses', {
        method: 'POST',
        body: JSON.stringify({ category, amount: Number(amount), date, description }),
      });
      setIsAddModalOpen(false);
      setAmount(0);
      setDescription('');
      loadData();
      showSuccess('Expense recorded successfully.');
    } catch (err: any) {
      showError(err, 'Failed to record expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this expense entry permanently? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetchApi(`/expenses/${id}`, { method: 'DELETE' });
      loadData();
      showSuccess('Expense deleted.');
    } catch (err: any) {
      showError(err, 'Failed to delete expense.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const canManageExpenses = me?.user?.role === 'owner' || me?.user?.role === 'manager';

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
              <h1 className="text-2xl font-black text-black tracking-tight">Expense Tracker</h1>
              <p className="text-xs text-zinc-500">Log logistics, craftsmanship labour, facility rent & operational costs</p>
            </div>

            {canManageExpenses && <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Expense</span>
            </button>}
          </div>

          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-bold text-black uppercase tracking-wider focus:outline-none focus:border-black"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Total Listed Expenses: <span className="text-black font-black text-lg ml-1">₹{totalExpenses.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Amount (₹)</th>
                    <th className="px-6 py-3.5">Description</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm font-medium">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-black">{e.date}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-zinc-100 border border-zinc-300 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-black">₹{e.amount?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-xs text-zinc-600">{e.description || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        {canManageExpenses && (
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          disabled={deletingId === e.id}
                          aria-label={`Delete expense from ${e.date}`}
                          className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {expenses.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">
                        No expense records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 className="font-black text-black text-lg uppercase tracking-tight">Record Expense</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Expense Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Description / Details
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tempo transport for raw wood planks"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
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
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
