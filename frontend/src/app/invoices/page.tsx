'use client';

import React, { useEffect, useState } from 'react';
import { Receipt, Printer, FileText } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { PrintInvoiceModal } from '@/components/PrintInvoiceModal';

export default function InvoicesPage() {
  const [me, setMe] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetchApi('/auth/me');
        setMe(meRes);
        const invRes = await fetchApi('/invoices');
        setInvoices(invRes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">Billing & Invoices</h1>
              <p className="text-xs text-zinc-500">Tax invoices, printable receipts & PDF downloads</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-black text-[10px] uppercase font-black tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Issue Date</th>
                    <th className="px-6 py-3.5">Total (₹)</th>
                    <th className="px-6 py-3.5">Paid (₹)</th>
                    <th className="px-6 py-3.5">Balance (₹)</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm font-medium">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/80 transition">
                      <td className="px-6 py-4 font-black text-black">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{inv.customer_name}</td>
                      <td className="px-6 py-4 text-xs text-zinc-500">{inv.issue_date}</td>
                      <td className="px-6 py-4 font-black text-black">₹{inv.total_amount?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 font-semibold text-zinc-700">₹{inv.paid_amount?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 font-black text-black">₹{inv.balance_amount?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setActiveInvoice(inv)}
                          className="inline-flex items-center gap-1.5 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-white" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {invoices.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 font-medium">
                        No invoices generated yet. Generate invoices directly from Orders or Counter billing!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <PrintInvoiceModal
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
        invoice={activeInvoice}
        business={me?.business}
      />
    </div>
  );
}
