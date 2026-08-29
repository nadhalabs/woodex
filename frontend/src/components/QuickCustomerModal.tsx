'use client';

import React, { useState } from 'react';
import { X, UserPlus, Loader2, Check } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: any) => void;
  initialPhone?: string;
  initialName?: string;
}

export function QuickCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  initialPhone = '',
  initialName = '',
}: QuickCustomerModalProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogAccessibility<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Customer name and phone number are required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetchApi('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim() || undefined,
          gstin: gstin.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      setError(err.message || 'Failed to create customer record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="quick-customer-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6 border border-zinc-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
          <div className="flex items-center gap-2 text-black">
            <UserPlus className="w-5 h-5 text-black" />
            <h3 id="quick-customer-title" className="font-black text-base uppercase tracking-wider">Add New Customer</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close add customer dialog" className="text-zinc-400 hover:text-black cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-customer-name" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Customer Name *
            </label>
            <input
              id="quick-customer-name"
              data-autofocus
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="quick-customer-phone" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Phone Number *
            </label>
            <input
              id="quick-customer-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="quick-customer-address" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Delivery / Billing Address
            </label>
            <textarea
              id="quick-customer-address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, Area, City & Pincode"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="quick-customer-gstin" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              GSTIN (Optional)
            </label>
            <input
              id="quick-customer-gstin"
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 29ABCDE1234F1Z5"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm uppercase font-mono text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="quick-customer-notes" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
              Notes (Optional)
            </label>
            <input
              id="quick-customer-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP client, preferred delivery time"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>

          {error && (
            <div role="alert" className="p-3 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-200 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !phone.trim()}
              className="w-full sm:w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Select</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
