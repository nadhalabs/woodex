'use client';

import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  order?: any;
  business: any;
}

export function PrintInvoiceModal({ isOpen, onClose, invoice, order, business }: PrintInvoiceModalProps) {
  const dialogRef = useDialogAccessibility<HTMLDivElement>(isOpen, onClose);
  if (!isOpen || (!invoice && !order)) return null;

  const inv = invoice || {};
  const ord = order || inv.order || {};
  const biz = business || {};

  const handlePrint = () => {
    window.print();
  };

  // Determine display values from invoice snapshots or live fallbacks
  const bizName = inv.business_name || biz.name || 'WOODEX Atelier';
  const bizAddress = inv.business_address || biz.address || '';
  const bizPhone = inv.business_phone || biz.phone || '';
  const bizGstin = inv.business_gstin || biz.gstin || '';

  const custName = inv.customer_name || ord.customer_name || 'Walk-in Customer';
  const custPhone = inv.customer_phone || ord.customer_phone || '';
  const custAddress = inv.customer_address || ord.delivery_address || '';
  const custGstin = inv.customer_gstin || '';

  const items = inv.items && inv.items.length > 0 ? inv.items : ord.items || [];
  const totalAmount = inv.total_amount ?? ord.total_amount ?? 0;
  const paidAmount = inv.paid_amount ?? ord.advance_amount ?? 0;
  const balanceAmount = inv.balance_amount ?? ord.balance_amount ?? 0;
  const subtotal = inv.subtotal ?? ord.subtotal ?? 0;
  const discount = inv.discount ?? ord.discount ?? 0;
  const taxAmount = inv.tax_amount ?? ord.tax_amount ?? 0;
  const taxRate = inv.tax_rate ?? ord.tax_rate ?? 18.0;

  const isOrder = Boolean(ord.order_number && (ord.order_status !== 'delivered' || ord.expected_delivery_date));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="print-invoice-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-zinc-300 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Action bar (hidden during print) */}
        <div className="bg-black text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-white" />
            <span id="print-invoice-title" className="font-bold text-sm sm:text-base tracking-tight">
              {inv.invoice_number ? `Tax Invoice — ${inv.invoice_number}` : `Order Receipt — ${ord.order_number}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black font-extrabold px-4 py-2 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice preview"
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-4 sm:p-12 text-zinc-900 bg-white overflow-y-auto" id="printable-invoice">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-black pb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-white font-black text-sm">
                  WX
                </div>
                <h1 className="text-2xl font-black text-black tracking-tight">{bizName}</h1>
              </div>
              {bizAddress && <p className="text-xs text-zinc-600 max-w-sm whitespace-pre-line font-medium">{bizAddress}</p>}
              {bizPhone && <p className="text-xs text-zinc-600 font-medium mt-0.5">Phone: {bizPhone}</p>}
              {bizGstin && <p className="text-xs font-bold text-black mt-0.5 font-mono">GSTIN: {bizGstin}</p>}
            </div>

            <div className="text-right">
              <span className="inline-block bg-black text-white font-black text-[11px] px-3 py-1 rounded uppercase tracking-widest mb-2">
                {isOrder ? 'FURNITURE ORDER / TAX INVOICE' : 'TAX INVOICE'}
              </span>
              {inv.invoice_number && (
                <div className="text-lg font-black text-black font-mono">Invoice: {inv.invoice_number}</div>
              )}
              {ord.order_number && (
                <div className="text-sm font-bold text-zinc-800 font-mono">Order: {ord.order_number}</div>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                Date: <span className="font-semibold text-black">{inv.issue_date || ord.order_date || new Date().toISOString().split('T')[0]}</span>
              </p>
              {inv.staff_name && (
                <p className="text-xs text-zinc-500">
                  Cashier: <span className="font-semibold text-black">{inv.staff_name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Customer & Delivery Section */}
          <div className="py-5 border-b border-zinc-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                Billed To Customer
              </span>
              <div className="text-base font-bold text-black">{custName}</div>
              {custPhone && <div className="text-xs text-zinc-600 font-medium mt-0.5">Phone: {custPhone}</div>}
              {custGstin && <div className="text-xs font-mono text-zinc-800 mt-0.5">GSTIN: {custGstin}</div>}
              {custAddress && <div className="text-xs text-zinc-600 mt-0.5 max-w-sm">{custAddress}</div>}
            </div>

            {isOrder && (
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">
                  Delivery Details
                </span>
                {ord.expected_delivery_date && (
                  <p className="text-xs text-zinc-900">
                    <span className="font-semibold">Expected Delivery:</span> {ord.expected_delivery_date}
                  </p>
                )}
                {ord.delivery_address && (
                  <p className="text-xs text-zinc-700 mt-0.5">
                    <span className="font-semibold">Address:</span> {ord.delivery_address}
                  </p>
                )}
                {ord.delivery_notes && (
                  <p className="text-xs text-zinc-500 italic mt-0.5">Note: {ord.delivery_notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-xs font-black uppercase tracking-wider text-black">
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5 text-center w-16">Qty</th>
                  <th className="py-2.5 text-right w-24">Rate (₹)</th>
                  <th className="py-2.5 text-right w-28">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-sm">
                {items.map((item: any, idx: number) => {
                  const itemTotal = item.total_price ?? item.quantity * item.unit_price;
                  return (
                    <tr key={idx}>
                      <td className="py-3 font-medium text-black">
                        <div className="font-semibold">{item.product_name}</div>
                        {item.sku && <div className="text-[11px] font-mono text-zinc-400">SKU: {item.sku}</div>}
                        {item.variant_name && (
                          <div className="text-xs text-zinc-700 font-semibold">{item.variant_name}</div>
                        )}
                      </td>
                      <td className="py-3 text-center text-zinc-800 font-bold">{item.quantity}</td>
                      <td className="py-3 text-right text-zinc-800">
                        {item.unit_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-black text-black">
                        {itemTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Custom Specifications (if any) */}
          {ord.custom_specs && Object.keys(ord.custom_specs).length > 0 && (
            <div className="mb-6 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs">
              <span className="font-black uppercase tracking-widest text-zinc-700 block mb-1">
                Custom Specifications & Material Notes
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-zinc-800">
                {Object.entries(ord.custom_specs).map(([k, v]: any) => (
                  <div key={k}>
                    <span className="font-semibold capitalize text-zinc-500">{k.replace('_', ' ')}: </span>
                    <span className="font-bold text-black">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Totals */}
          <div className="pt-4 border-t-2 border-black flex justify-between items-start">
            <div className="max-w-xs text-xs text-zinc-500 space-y-1">
              <p className="font-bold text-black">Terms & Conditions:</p>
              <p>1. Goods once sold cannot be returned or exchanged.</p>
              <p>2. Advance payments are credited towards the final order balance.</p>
              {biz.invoice_footer && (
                <p className="mt-2 text-zinc-700 font-medium italic">{biz.invoice_footer}</p>
              )}
            </div>

            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-black">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-zinc-900 font-medium">
                  <span>Discount:</span>
                  <span className="font-semibold">
                    -₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>GST / Tax ({taxRate}%):</span>
                  <span className="font-semibold text-black">
                    ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-black pt-2 border-t border-zinc-300">
                <span>Grand Total:</span>
                <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-black font-bold pt-1">
                <span>Amount Paid:</span>
                <span>₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between text-black font-black text-base pt-1 border-t border-dashed border-zinc-300">
                <span>Balance Due:</span>
                <span>₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-14 pt-6 border-t border-zinc-200 flex justify-between items-end text-xs text-zinc-500">
            <div>
              <p className="font-medium">Thank you for choosing {bizName}!</p>
              <p className="font-bold text-black">WOODEX — Luxury Furniture Software</p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-black w-44 mb-1"></div>
              <p className="font-bold text-black uppercase tracking-wider text-[11px]">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
