'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Sparkles, ChevronRight, CreditCard, Receipt, Truck, Eye, X, Check, Trash2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { showError, showSuccess } from '@/lib/feedback';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { SpecDrawer } from '@/components/SpecDrawer';
import { PrintInvoiceModal } from '@/components/PrintInvoiceModal';

export default function OrdersPage() {
  const [me, setMe] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Custom Spec Drawer State
  const [activeSpecOrder, setActiveSpecOrder] = useState<any>(null);

  // Invoice Modal State
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  // Record Payment Modal State
  const [payingOrder, setPayingOrder] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('upi');
  const [payRef, setPayRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Create Order Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [items, setItems] = useState<any[]>([{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }]);
  
  // Custom Specs fields for order creation
  const [dimensions, setDimensions] = useState('');
  const [woodType, setWoodType] = useState('Burma Teak');
  const [colorFinish, setColorFinish] = useState('Dark Walnut');
  const [fabric, setFabric] = useState('');
  const [designNotes, setDesignNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  async function loadData() {
    try {
      const meRes = await fetchApi('/auth/me');
      setMe(meRes);
      const oRes = await fetchApi('/orders');
      setOrders(oRes);
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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const customSpecsObj = (dimensions || woodType || colorFinish || fabric || designNotes) ? {
        dimensions,
        wood_type: woodType,
        color: colorFinish,
        fabric,
        design_notes: designNotes
      } : null;

      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          order_date: orderDate,
          expected_delivery_date: deliveryDate,
          custom_specs: customSpecsObj,
          discount: Number(discount),
          tax_amount: Number(taxAmount),
          advance_amount: Number(advanceAmount),
          delivery_address: deliveryAddress,
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
      showSuccess('Order created successfully.');
    } catch (err: any) {
      showError(err, 'Order creation failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAdvance = async (orderId: string, currentStatus: string) => {
    if (actionOrderId) return;
    const sequence = ['new', 'confirmed', 'in_progress', 'ready', 'out_for_delivery', 'delivered'];
    const idx = sequence.indexOf(currentStatus);
    if (idx === -1 || idx === sequence.length - 1) return;
    const nextStatus = sequence[idx + 1];

    setActionOrderId(orderId);
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ order_status: nextStatus }),
      });
      loadData();
      showSuccess('Order status updated.');
    } catch (err: any) {
      showError(err, 'Status transition failed.');
    } finally {
      setActionOrderId(null);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;
    setSubmittingPayment(true);
    try {
      await fetchApi('/payments', {
        method: 'POST',
        body: JSON.stringify({
          order_id: payingOrder.id,
          amount: Number(payAmount),
          payment_method: payMethod,
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: payRef,
        }),
      });
      setPayingOrder(null);
      loadData();
      showSuccess('Payment recorded successfully.');
    } catch (err: any) {
      showError(err, 'Payment recording failed.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    if (actionOrderId) return;
    setActionOrderId(orderId);
    try {
      const inv = await fetchApi(`/invoices/from-order/${orderId}`, { method: 'POST' });
      setActiveInvoice(inv);
      showSuccess('Invoice generated successfully.');
    } catch (err: any) {
      showError(err, 'Failed to generate invoice.');
    } finally {
      setActionOrderId(null);
    }
  };

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
              <h1 className="text-2xl font-black text-black tracking-tight">Orders Management</h1>
              <p className="text-xs text-zinc-500">Track order lifecycles, advance payments & bespoke delivery schedules</p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white font-extrabold px-4 py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Create New Order</span>
            </button>
          </div>

          {/* Orders Cards / Table */}
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs hover:border-black hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Order Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-black text-black text-lg">{ord.order_number}</span>
                    <StatusBadge status={ord.order_status} type="order" />
                    <StatusBadge status={ord.payment_status} type="payment" />
                    {ord.custom_specs && (
                      <button
                        onClick={() => setActiveSpecOrder(ord)}
                        className="inline-flex items-center gap-1 bg-zinc-100 text-black border border-zinc-300 text-xs font-bold px-2.5 py-0.5 rounded-full hover:bg-zinc-200 transition cursor-pointer uppercase tracking-wider text-[10px]"
                      >
                        <Sparkles className="w-3 h-3 text-black" />
                        <span>Custom Specs</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zinc-600">
                    <div>Customer: <span className="font-bold text-black">{ord.customer_name}</span> ({ord.customer_phone})</div>
                    <div>Order Date: <span className="font-semibold text-black">{ord.order_date}</span></div>
                    {ord.expected_delivery_date && (
                      <div>Delivery Due: <span className="font-semibold text-black">{ord.expected_delivery_date}</span></div>
                    )}
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-zinc-500 pt-1 font-medium">
                    Items: {(ord.items || []).map((i: any) => `${i.product_name} (x${i.quantity})`).join(', ')}
                  </div>
                </div>

                {/* Amount & Balance */}
                <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-zinc-200 pt-4 lg:pt-0 lg:pl-6">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest">Total Amount</div>
                    <div className="text-xl font-black text-black">₹{ord.total_amount?.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-600 font-medium">Advance: ₹{ord.advance_amount?.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-black font-black">Balance: ₹{ord.balance_amount?.toLocaleString('en-IN')}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Status Stepper Action */}
                    {ord.order_status !== 'delivered' && (
                      <button
                        onClick={() => handleStatusAdvance(ord.id, ord.order_status)}
                        disabled={actionOrderId === ord.id}
                        className="inline-flex items-center justify-center gap-1.5 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl transition cursor-pointer"
                      >
                        <span>Next Lifecycle</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                      </button>
                    )}

                    {/* Record Payment Button */}
                    {ord.balance_amount > 0 && (
                      <button
                        onClick={() => {
                          setPayingOrder(ord);
                          setPayAmount(ord.balance_amount);
                          setPayRef('');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition shadow-2xs cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>
                    )}

                    {/* Invoice Button */}
                    <button
                      onClick={() => handleGenerateInvoice(ord.id)}
                      disabled={actionOrderId === ord.id}
                      className="inline-flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition border border-zinc-200 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-black" />
                      <span>Print Invoice</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {orders.length === 0 && !loading && (
              <div className="bg-white rounded-2xl p-12 text-center text-zinc-400 border border-zinc-200 font-medium">
                No orders booked yet. Click "Create New Order" to start!
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Custom Spec Drawer Component */}
      <SpecDrawer
        isOpen={!!activeSpecOrder}
        onClose={() => setActiveSpecOrder(null)}
        specs={activeSpecOrder?.custom_specs}
        orderNumber={activeSpecOrder?.order_number}
      />

      {/* Print Invoice Modal */}
      <PrintInvoiceModal
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
        invoice={activeInvoice}
        business={me?.business}
      />

      {/* Record Payment Modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <h3 className="font-black text-black text-base uppercase tracking-tight">Record Payment — {payingOrder.order_number}</h3>
              <button onClick={() => setPayingOrder(null)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs">
                <div className="flex justify-between text-zinc-600 mb-1">
                  <span>Order Total:</span>
                  <span className="font-bold text-black">₹{payingOrder.total_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-black font-black">
                  <span>Outstanding Balance:</span>
                  <span>₹{payingOrder.balance_amount?.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={payingOrder.balance_amount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="upi">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card (Debit / Credit)</option>
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UPI/12983910"
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPayingOrder(null)}
                  className="w-1/2 py-2.5 border border-zinc-300 text-zinc-800 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="w-1/2 py-2.5 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-md disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-zinc-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-4">
              <h3 className="font-black text-lg text-black uppercase tracking-tight">Create New Furniture Order</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
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
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Ordered Products / Items *
                  </label>
                  <button
                    type="button"
                    onClick={() => setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }])}
                    className="text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product Line</span>
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
                            {p.name} (Stock: {p.current_stock}) - ₹{p.selling_price}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Description"
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

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(items.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-black"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advance Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Advance Payment Booking Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-bold text-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Customer delivery location"
                    className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-medium text-black"
                  />
                </div>
              </div>

              {/* Custom Furniture Specs Section */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black">
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Custom Furniture Specs (Optional)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Dimensions (e.g. 72in x 36in x 30in)"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-black"
                  />
                  <input
                    type="text"
                    placeholder="Wood Material (e.g. Burma Teak)"
                    value={woodType}
                    onChange={(e) => setWoodType(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Color & Polish Finish (e.g. Dark Walnut)"
                    value={colorFinish}
                    onChange={(e) => setColorFinish(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-black"
                  />
                  <input
                    type="text"
                    placeholder="Fabric / Upholstery (e.g. Velvet)"
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-black"
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
                  {saving ? 'Creating...' : 'Book Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
