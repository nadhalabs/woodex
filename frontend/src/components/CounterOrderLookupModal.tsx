'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  Receipt,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { StatusBadge } from './StatusBadge';
import { PrintInvoiceModal } from './PrintInvoiceModal';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface CounterOrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: any;
}

export function CounterOrderLookupModal({
  isOpen,
  onClose,
  business,
}: CounterOrderLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('upi');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Print Modal
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const dialogRef = useDialogAccessibility<HTMLDivElement>(isOpen && !isPrintOpen, onClose);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetchApi(`/counter/search-orders?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res);
      if (res.length === 1) {
        selectOrder(res[0]);
      }
    } catch (err) {
      console.error('Order search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectOrder = async (order: any) => {
    setSelectedOrder(order);
    setPayAmount(order.balance_amount || 0);
    setPayReference('');
    setPayNotes('');
    setPaymentError(null);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || payAmount <= 0) return;

    if (payAmount > selectedOrder.balance_amount) {
      setPaymentError(`Payment cannot exceed outstanding balance of ₹${selectedOrder.balance_amount}`);
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await fetchApi('/payments', {
        method: 'POST',
        body: JSON.stringify({
          order_id: selectedOrder.id,
          amount: Number(payAmount),
          payment_method: payMethod.toLowerCase(),
          payment_date: todayStr,
          reference_number: payReference.trim() || undefined,
          notes: payNotes.trim() || undefined,
        }),
      });

      // Refresh selected order
      const updatedOrder = await fetchApi(`/orders/${selectedOrder.id}`);
      setSelectedOrder(updatedOrder);
      setPayAmount(updatedOrder.balance_amount || 0);
      setPayReference('');
      setPayNotes('');

      // Refresh in list
      setSearchResults((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      showSuccess('Payment recorded successfully.');
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setPaymentError(err.message || 'Payment recording failed');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeliveryStatusUpdate = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      const updatedOrder = await fetchApi(`/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ delivery_status: newStatus }),
      });
      setSelectedOrder(updatedOrder);
      setSearchResults((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
      showSuccess('Delivery status updated.');
    } catch (err: any) {
      showError(err, 'Failed to update delivery status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="counter-order-lookup-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-zinc-300 overflow-hidden my-3 sm:my-6 max-h-[94vh] sm:max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-black text-white p-4 sm:px-6 flex items-start justify-between gap-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-white" />
            <div>
              <h3 id="counter-order-lookup-title" className="font-black text-base uppercase tracking-wider">Counter Order Lookup & Payments</h3>
              <p className="text-xs text-zinc-400">Search customer orders, record installment payments, & reprint</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order lookup dialog" className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
              <input
                aria-label="Search orders"
                data-autofocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order # (e.g. ORD-2026-000001), Customer Name, or Phone..."
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-medium text-black transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="bg-black hover:bg-zinc-800 text-white font-black px-6 py-2.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </form>

          {/* Results Grid / List */}
          {searchResults.length > 0 && !selectedOrder && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Found {searchResults.length} Matching Orders
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {searchResults.map((ord) => (
                  <button
                    type="button"
                    key={ord.id}
                    onClick={() => selectOrder(ord)}
                    className="p-4 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 hover:border-black rounded-xl transition cursor-pointer flex flex-col justify-between space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-black font-mono">{ord.order_number}</span>
                      <StatusBadge status={ord.payment_status} type="payment" />
                    </div>
                    <div className="text-xs text-zinc-600 space-y-0.5">
                      <div className="font-bold text-black">{ord.customer_name || 'Customer'}</div>
                      {ord.customer_phone && <div>📞 {ord.customer_phone}</div>}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-200">
                      <span className="text-zinc-500">Total: ₹{ord.total_amount?.toLocaleString('en-IN')}</span>
                      <span className="font-black text-black">Due: ₹{ord.balance_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Order Details View */}
          {selectedOrder && (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="bg-black text-white rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-xl text-white font-mono">{selectedOrder.order_number}</span>
                    <StatusBadge status={selectedOrder.payment_status} type="payment" />
                    <StatusBadge status={selectedOrder.delivery_status} type="delivery" />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Ordered on {selectedOrder.order_date} • Expected Delivery: {selectedOrder.expected_delivery_date || 'N/A'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsPrintOpen(true)}
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-zinc-700 uppercase tracking-wider"
                  >
                    <Printer className="w-3.5 h-3.5 text-white" />
                    <span>Reprint Invoice</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-2"
                  >
                    Back to List
                  </button>
                </div>
              </div>

              {/* 2-Column Info & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Customer & Items */}
                <div className="space-y-4">
                  {/* Customer Card */}
                  <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Customer Information
                    </span>
                    <div className="font-bold text-black text-base">{selectedOrder.customer_name || 'Walk-in Customer'}</div>
                    {selectedOrder.customer_phone && (
                      <div className="text-xs text-zinc-600 mt-0.5">📞 {selectedOrder.customer_phone}</div>
                    )}
                    {selectedOrder.delivery_address && (
                      <div className="text-xs text-zinc-600 mt-1">📍 {selectedOrder.delivery_address}</div>
                    )}
                  </div>

                  {/* Items Ordered */}
                  <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-800 uppercase">
                      Ordered Products
                    </div>
                    <div className="p-3 divide-y divide-zinc-100 max-h-48 overflow-y-auto">
                      {(selectedOrder.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-black">{item.product_name}</div>
                            {item.variant_name && (
                              <div className="text-[11px] text-zinc-600 font-semibold">{item.variant_name}</div>
                            )}
                            <div className="text-[11px] text-zinc-400">Qty: {item.quantity} × ₹{item.unit_price}</div>
                          </div>
                          <div className="font-black text-black">₹{item.total_price?.toLocaleString('en-IN')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Balance Breakdown */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-700">
                      <span>Order Total:</span>
                      <span className="font-bold text-black">₹{selectedOrder.total_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-zinc-700">
                      <span>Total Paid So Far:</span>
                      <span className="font-bold text-black">₹{selectedOrder.advance_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-black font-black text-sm pt-1.5 border-t border-zinc-300">
                      <span>Outstanding Balance:</span>
                      <span>₹{selectedOrder.balance_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Record Payment & Delivery Controls */}
                <div className="space-y-4">
                  {/* Record Payment Form */}
                  {selectedOrder.balance_amount > 0 ? (
                    <div className="bg-white rounded-2xl p-5 border-2 border-black shadow-xs space-y-4">
                      <div className="flex items-center gap-2 text-black border-b border-zinc-100 pb-2">
                        <CreditCard className="w-4 h-4 text-black" />
                        <h4 className="font-black text-sm uppercase tracking-tight">Record Balance Payment</h4>
                      </div>

                      <form onSubmit={handleRecordPayment} className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label htmlFor="lookup-payment-amount" className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                              Payment Amount (₹) *
                            </label>
                            <button
                              type="button"
                              onClick={() => setPayAmount(selectedOrder.balance_amount)}
                              className="text-[11px] font-bold text-black underline"
                            >
                              Full Balance (₹{selectedOrder.balance_amount})
                            </button>
                          </div>
                          <input
                            id="lookup-payment-amount"
                            type="number"
                            required
                            min={1}
                            max={selectedOrder.balance_amount}
                            value={payAmount}
                            onChange={(e) => setPayAmount(Number(e.target.value))}
                            className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-base font-black text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                            Payment Method *
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {['upi', 'cash', 'card', 'bank_transfer'].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setPayMethod(m)}
                                aria-pressed={payMethod === m}
                                className={`py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                                  payMethod === m
                                    ? 'bg-black text-white shadow-xs'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                              >
                                {m.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label htmlFor="lookup-payment-reference" className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                            Reference / Txn ID
                          </label>
                          <input
                            id="lookup-payment-reference"
                            type="text"
                            value={payReference}
                            onChange={(e) => setPayReference(e.target.value)}
                            placeholder="e.g. UPI-987654321"
                            className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-300 rounded-lg text-xs"
                          />
                        </div>

                        {paymentError && (
                          <div role="alert" className="p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-lg text-xs font-medium">
                            {paymentError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={paymentSubmitting || payAmount <= 0}
                          className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {paymentSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Recording Payment...</span>
                            </>
                          ) : (
                            <span>Record Payment (₹{payAmount.toLocaleString('en-IN')})</span>
                          )}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 text-center space-y-1 text-black">
                      <CheckCircle2 className="w-8 h-8 text-black mx-auto" />
                      <div className="font-extrabold text-sm">Order is Fully Paid</div>
                      <p className="text-xs text-zinc-500">All balances for this order have been cleared.</p>
                    </div>
                  )}

                  {/* Delivery Status Quick Toggle */}
                  <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Update Delivery Status
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {['pending', 'scheduled', 'out_for_delivery', 'delivered'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleDeliveryStatusUpdate(st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                            selectedOrder.delivery_status === st
                              ? 'bg-black text-white shadow-xs'
                              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Invoice Modal */}
      <PrintInvoiceModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        order={selectedOrder}
        invoice={null}
        business={business}
      />
    </div>
  );
}
