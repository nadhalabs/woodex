'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, Store, Receipt, Sliders } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';

export default function SettingsPage() {
  const [me, setMe] = useState<any>(null);
  
  // Store Settings State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [plan, setPlan] = useState('lite');

  // Billing & Counter Settings State
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [orderPrefix, setOrderPrefix] = useState('ORD-');
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(18.0);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [allowNegativeStock, setAllowNegativeStock] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const meRes = await fetchApi('/auth/me');
        setMe(meRes);
        const biz = meRes.business || {};
        setName(biz.name || '');
        setPhone(biz.phone || '');
        setAddress(biz.address || '');
        setGstin(biz.gstin || '');
        setPlan(biz.plan || 'lite');

        setInvoicePrefix(biz.invoice_prefix || 'INV-');
        setOrderPrefix(biz.order_prefix || 'ORD-');
        setDefaultTaxRate(biz.default_tax_rate !== undefined ? biz.default_tax_rate : 18.0);
        setTaxInclusive(Boolean(biz.tax_inclusive));
        setInvoiceFooter(biz.invoice_footer || '');
        setAllowNegativeStock(Boolean(biz.allow_negative_stock));
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        phone,
        address,
        gstin,
        plan,
        invoice_prefix: invoicePrefix,
        order_prefix: orderPrefix,
        default_tax_rate: Number(defaultTaxRate),
        tax_inclusive: Boolean(taxInclusive),
        invoice_footer: invoiceFooter,
        allow_negative_stock: Boolean(allowNegativeStock),
      };

      const updated = await fetchApi('/business', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setMe({ ...me, business: updated });
      showSuccess('Store and billing settings updated successfully.');
    } catch (err: any) {
      showError(err, 'Settings update failed.');
    } finally {
      setSaving(false);
    }
  };

  const canEditSettings = me?.user?.role === 'owner';

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

        <main className="p-4 sm:p-8 max-w-4xl w-full mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-black text-black tracking-tight">Store & Billing Settings</h1>
            <p className="text-xs text-zinc-500">Business details, Counter POS defaults, GST settings & WOODEX edition preferences</p>
          </div>

          {!canEditSettings && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700">
              Settings are read-only. Only the business owner can make changes.
            </div>
          )}

          <form onSubmit={handleSave}>
            <fieldset disabled={!canEditSettings} className="space-y-6 disabled:opacity-70">
            {/* SECTION 1: BUSINESS STORE DETAILS */}
            <div className="bg-white rounded-2xl p-4 sm:p-8 border border-zinc-200 shadow-2xs space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-zinc-100 text-black">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-black text-lg uppercase tracking-tight">Business & Store Profile</h3>
                    <p className="text-xs text-zinc-500 font-medium">Appears on customer invoices & receipts</p>
                  </div>
                </div>
                <StatusBadge status={plan} type="plan" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="settings-business-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Business Store Name *
                  </label>
                  <input
                    id="settings-business-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label htmlFor="settings-phone" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Store Contact Phone
                  </label>
                  <input
                    id="settings-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="settings-address" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Store Address
                  </label>
                  <textarea
                    id="settings-address"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label htmlFor="settings-gstin" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Store GSTIN Number
                  </label>
                  <input
                    id="settings-gstin"
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-mono font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                {/* WOODEX Plan Selector */}
                <div>
                  <label htmlFor="settings-plan" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    WOODEX Subscription Edition *
                  </label>
                  <select
                    id="settings-plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="lite">WOODEX Lite (Counter, Billing, Orders, Stock, Delivery)</option>
                    <option value="standard">WOODEX Standard (+ Suppliers, POs, Variants, Staff)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: COUNTER & BILLING DEFAULTS */}
            <div className="bg-white rounded-2xl p-4 sm:p-8 border border-zinc-200 shadow-2xs space-y-6">
              <div className="flex items-center gap-3 pb-6 border-b border-zinc-100">
                <div className="p-3 rounded-xl bg-zinc-100 text-black">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-black text-lg uppercase tracking-tight">Billing & Counter POS Defaults</h3>
                  <p className="text-xs text-zinc-500 font-medium">Configure sequential numbering, tax calculations, and print policies</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="settings-invoice-prefix" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Invoice Prefix
                  </label>
                  <input
                    id="settings-invoice-prefix"
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="INV-"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-mono font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1 font-medium">e.g. INV-2026-000001</p>
                </div>

                <div>
                  <label htmlFor="settings-order-prefix" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Order Prefix
                  </label>
                  <input
                    id="settings-order-prefix"
                    type="text"
                    value={orderPrefix}
                    onChange={(e) => setOrderPrefix(e.target.value)}
                    placeholder="ORD-"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-mono font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1 font-medium">e.g. ORD-2026-000001</p>
                </div>

                <div>
                  <label htmlFor="settings-tax-rate" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Default GST Rate (%)
                  </label>
                  <input
                    id="settings-tax-rate"
                    type="number"
                    min={0}
                    step={0.5}
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taxInclusive}
                      onChange={(e) => setTaxInclusive(e.target.checked)}
                      className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black"
                    />
                    <span>Default to Tax-Inclusive Pricing (MRP includes GST)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowNegativeStock}
                      onChange={(e) => setAllowNegativeStock(e.target.checked)}
                      className="w-4 h-4 text-black rounded border-zinc-300 focus:ring-black"
                    />
                    <span>Allow Billing with Negative Stock (Disable shortage warning)</span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="settings-invoice-footer" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                    Invoice Footer / Terms Note
                  </label>
                  <textarea
                    id="settings-invoice-footer"
                    rows={2}
                    value={invoiceFooter}
                    onChange={(e) => setInvoiceFooter(e.target.value)}
                    placeholder="e.g. Thank you for your custom! Warranty terms apply for 12 months on all luxury furniture."
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 flex justify-stretch sm:justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-6 py-3 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Changes...' : 'Save Store & Billing Settings'}</span>
                </button>
              </div>
            </div>
            </fieldset>
          </form>
        </main>
      </div>
    </div>
  );
}
