'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  UserPlus,
  Phone,
  Printer,
  Save,
  PauseCircle,
  PlayCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
  Layers,
  Store,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Tag,
  CreditCard,
  Building,
  Sliders,
  DollarSign,
  Keyboard,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { QuickCustomerModal } from '@/components/QuickCustomerModal';
import { CounterOrderLookupModal } from '@/components/CounterOrderLookupModal';
import { PrintInvoiceModal } from '@/components/PrintInvoiceModal';
import { getOptimizedImageUrl } from '@/lib/cloudinary';

interface CartItem {
  product_id?: string;
  product_name: string;
  sku?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  default_price: number;
  discount: number;
  available_stock: number;
}

export default function CounterPage() {
  const [me, setMe] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [heldBills, setHeldBills] = useState<any[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Active Bill State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [saleType, setSaleType] = useState<'direct_sale' | 'customer_order'>('direct_sale');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Customer Order Details
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [customSpecsOpen, setCustomSpecsOpen] = useState(false);
  const [customSpecs, setCustomSpecs] = useState({
    dimensions: '',
    wood_type: '',
    finish: '',
    fabric: '',
    colour: '',
    design_notes: '',
  });

  // Discounts & Tax
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [taxRate, setTaxRate] = useState<number>(18.0);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Modals & Drawers
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [isOrderLookupOpen, setIsOrderLookupOpen] = useState(false);
  const [isHeldBillsDrawerOpen, setIsHeldBillsDrawerOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Processing & Errors
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // References
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const paidInputRef = useRef<HTMLInputElement>(null);

  // Initial Data Load
  async function loadInitialData() {
    try {
      const [meRes, prodRes, catRes, custRes, heldRes] = await Promise.all([
        fetchApi('/auth/me'),
        fetchApi('/products'),
        fetchApi('/categories'),
        fetchApi('/customers'),
        fetchApi('/counter/held-bills'),
      ]);
      setMe(meRes);
      setProducts(prodRes);
      setCategories(catRes);
      setCustomers(custRes);
      setHeldBills(heldRes);

      // Default Tax Settings from Business
      if (meRes?.business) {
        if (meRes.business.default_tax_rate !== undefined) {
          setTaxRate(meRes.business.default_tax_rate);
        }
        if (meRes.business.tax_inclusive !== undefined) {
          setTaxInclusive(meRes.business.tax_inclusive);
        }
      }
    } catch (err) {
      console.error('Failed to load counter data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input unless shortcut key like F-keys
      if (e.key === 'F2') {
        e.preventDefault();
        resetBill();
      } else if (e.key === 'F4') {
        e.preventDefault();
        customerSearchRef.current?.focus();
        setIsCustomerDropdownOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        paidInputRef.current?.focus();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleCheckout(true);
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, selectedCustomer, paidAmount, billDiscount, taxRate, taxInclusive]);

  // Real-time calculations for frontend preview
  const rawSubtotal = cartItems.reduce((acc, item) => {
    const gross = item.quantity * item.unit_price;
    const lineTotal = Math.max(0, gross - (item.discount || 0));
    return acc + lineTotal;
  }, 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round(((rawSubtotal * billDiscount) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(rawSubtotal, Number(billDiscount || 0));
  }

  const taxableBase = Math.max(0, rawSubtotal - discountAmount);
  let taxAmount = 0;
  let grandTotal = 0;

  if (taxInclusive && taxRate > 0) {
    const divisor = 1 + taxRate / 100;
    const net = taxableBase / divisor;
    taxAmount = Math.round((taxableBase - net) * 100) / 100;
    grandTotal = Math.round(taxableBase * 100) / 100;
  } else {
    taxAmount = Math.round(((taxableBase * taxRate) / 100) * 100) / 100;
    grandTotal = Math.round((taxableBase + taxAmount) * 100) / 100;
  }

  const balanceAmount = Math.max(0, Math.round((grandTotal - (paidAmount || 0)) * 100) / 100);

  // Sync paid amount when Direct Sale is chosen and cart changes
  const setFullPayment = () => {
    setPaidAmount(grandTotal);
  };

  // Add Product to Bill
  const addToCart = (product: any) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product_id === product.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku || '',
            variant_name: '',
            quantity: 1,
            unit_price: product.selling_price || 0,
            default_price: product.selling_price || 0,
            discount: 0,
            available_stock: product.current_stock ?? 999,
          },
        ];
      }
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const updateCartPrice = (index: number, newPrice: number) => {
    // Only owner/manager can edit price or check
    if (me?.user?.role === 'staff' && newPrice < cartItems[index].default_price) {
      alert(`Staff cannot reduce unit price below standard selling price (₹${cartItems[index].default_price})`);
      return;
    }
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index].unit_price = Math.max(0, newPrice);
      return updated;
    });
  };

  const removeCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetBill = () => {
    setSelectedCustomer(null);
    setCartItems([]);
    setBillDiscount(0);
    setPaidAmount(0);
    setPaymentReference('');
    setPaymentNotes('');
    setExpectedDeliveryDate('');
    setDeliveryAddress('');
    setDeliveryNotes('');
    setCustomSpecs({
      dimensions: '',
      wood_type: '',
      finish: '',
      fabric: '',
      colour: '',
      design_notes: '',
    });
    setCheckoutError(null);
  };

  // Hold Bill
  const handleHoldBill = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty. Nothing to hold.');
      return;
    }

    const label = selectedCustomer
      ? `${selectedCustomer.name} (${cartItems.length} items)`
      : `Walk-in (${cartItems.length} items - ₹${grandTotal})`;

    const billData = {
      selectedCustomer,
      saleType,
      cartItems,
      billDiscount,
      discountType,
      taxRate,
      taxInclusive,
      paidAmount,
      paymentMethod,
      expectedDeliveryDate,
      deliveryAddress,
      deliveryNotes,
      customSpecs,
    };

    try {
      const res = await fetchApi('/counter/held-bills', {
        method: 'POST',
        body: JSON.stringify({ hold_label: label, bill_data: billData }),
      });
      setHeldBills((prev) => [res, ...prev]);
      resetBill();
      alert('Bill held successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to hold bill');
    }
  };

  // Resume Held Bill
  const handleResumeBill = async (held: any) => {
    const data = held.bill_data || {};
    setSelectedCustomer(data.selectedCustomer || null);
    setSaleType(data.saleType || 'direct_sale');
    setCartItems(data.cartItems || []);
    setBillDiscount(data.billDiscount || 0);
    setDiscountType(data.discountType || 'fixed');
    setTaxRate(data.taxRate !== undefined ? data.taxRate : 18.0);
    setTaxInclusive(data.taxInclusive || false);
    setPaidAmount(data.paidAmount || 0);
    setPaymentMethod(data.paymentMethod || 'cash');
    setExpectedDeliveryDate(data.expectedDeliveryDate || '');
    setDeliveryAddress(data.deliveryAddress || '');
    setDeliveryNotes(data.deliveryNotes || '');
    setCustomSpecs(data.customSpecs || {
      dimensions: '',
      wood_type: '',
      finish: '',
      fabric: '',
      colour: '',
      design_notes: '',
    });

    // Delete from held bills in DB
    try {
      await fetchApi(`/counter/held-bills/${held.id}`, { method: 'DELETE' });
      setHeldBills((prev) => prev.filter((h) => h.id !== held.id));
    } catch (err) {
      console.error('Failed to clean up resumed bill:', err);
    }

    setIsHeldBillsDrawerOpen(false);
  };

  // Complete Checkout
  const handleCheckout = async (autoPrint: boolean = false) => {
    if (cartItems.length === 0) {
      setCheckoutError('Please add at least one product to the bill.');
      return;
    }

    setCheckingOut(true);
    setCheckoutError(null);

    // Clean Custom Specs (exclude empty strings)
    const cleanedCustomSpecs: Record<string, string> = {};
    Object.entries(customSpecs).forEach(([k, v]) => {
      if (v.trim()) cleanedCustomSpecs[k] = v.trim();
    });

    const idempotencyKey = `CKOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = {
      sale_type: saleType,
      customer_id: selectedCustomer?.id || undefined,
      customer_name: selectedCustomer?.name || 'Walk-in Customer',
      customer_phone: selectedCustomer?.phone || '0000000000',
      customer_address: selectedCustomer?.address || deliveryAddress || undefined,
      customer_gstin: selectedCustomer?.gstin || undefined,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        variant_name: item.variant_name || undefined,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        discount: Number(item.discount || 0),
      })),
      bill_discount: Number(billDiscount),
      discount_type: discountType,
      tax_rate: Number(taxRate),
      tax_inclusive: Boolean(taxInclusive),
      paid_amount: Number(paidAmount || 0),
      payment_method: paymentMethod,
      payment_reference: paymentReference.trim() || undefined,
      payment_notes: paymentNotes.trim() || undefined,
      expected_delivery_date: saleType === 'customer_order' ? expectedDeliveryDate || undefined : undefined,
      delivery_address: deliveryAddress.trim() || undefined,
      delivery_notes: deliveryNotes.trim() || undefined,
      custom_specs: Object.keys(cleanedCustomSpecs).length > 0 ? cleanedCustomSpecs : undefined,
      idempotency_key: idempotencyKey,
    };

    try {
      const res = await fetchApi('/counter/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCompletedInvoice(res.invoice);
      setCompletedOrder(res.order);

      // Refresh product list for stock count
      const updatedProducts = await fetchApi('/products');
      setProducts(updatedProducts);

      resetBill();

      if (autoPrint) {
        setIsPrintModalOpen(true);
      } else {
        alert(`Sale completed successfully! Invoice #${res.invoice?.invoice_number || res.order?.order_number}`);
      }
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setCheckoutError(err.message || 'Checkout failed. Please check stock and details.');
    } finally {
      setCheckingOut(false);
    }
  };

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    if (selectedCategoryId && p.category_id !== selectedCategoryId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  // Filter customer search dropdown
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchQuery) return true;
    const q = customerSearchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex overflow-hidden">
      <Sidebar businessPlan={me?.business?.plan} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          userName={me?.user?.name}
          userRole={me?.user?.role}
          businessName={me?.business?.name}
          businessPlan={me?.business?.plan}
        />

        {/* Counter Operational Screen */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT COLUMN: PRODUCT SELECTION & CATALOGUE */}
          <div className="flex-1 flex flex-col bg-[#fbfbfb] border-r border-zinc-200 overflow-hidden">
            {/* Top Toolbar: Search & Shortcuts Guide */}
            <div className="p-4 bg-white border-b border-zinc-200 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product name, SKU, or code... (Press '/' to focus)"
                    className="w-full pl-10 pr-12 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm font-semibold text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-2xs"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOrderLookupOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer uppercase tracking-wider"
                  >
                    <Search className="w-3.5 h-3.5 text-white" />
                    <span>Search Orders</span>
                  </button>

                  <button
                    onClick={() => setIsHeldBillsDrawerOpen(true)}
                    className="relative inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer uppercase tracking-wider"
                  >
                    <Clock className="w-3.5 h-3.5 text-black" />
                    <span>Held Bills</span>
                    {heldBills.length > 0 && (
                      <span className="bg-black text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                        {heldBills.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategoryId === ''
                      ? 'bg-black text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  All Items ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategoryId === cat.id
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {cat.name} ({cat.product_count || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {filteredProducts.map((p) => {
                  const isOut = p.current_stock <= 0;
                  const isLow = p.current_stock > 0 && p.current_stock <= (p.low_stock_level || 2);
                  const img = p.image_url || (p.images && p.images[0]?.url);

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOut && addToCart(p)}
                      className={`bg-white rounded-xl border p-3 flex flex-col justify-between transition cursor-pointer select-none group ${
                        isOut
                          ? 'opacity-50 border-zinc-200 cursor-not-allowed bg-zinc-50'
                          : 'hover:border-black hover:shadow-md border-zinc-200'
                      }`}
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="aspect-[4/3] rounded-lg bg-zinc-100 mb-2.5 overflow-hidden relative">
                          {img ? (
                            <img
                              src={getOptimizedImageUrl(img, { width: 220, height: 165, crop: 'fill' })}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <Store className="w-6 h-6 opacity-30" />
                            </div>
                          )}

                          {/* Stock Tag */}
                          <div className="absolute top-1.5 right-1.5">
                            {isOut ? (
                              <span className="bg-zinc-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
                                Out
                              </span>
                            ) : isLow ? (
                              <span className="bg-black text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs">
                                Stock: {p.current_stock}
                              </span>
                            ) : (
                              <span className="bg-zinc-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                {p.current_stock} in stock
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & SKU */}
                        <h4 className="font-bold text-zinc-950 text-xs leading-snug line-clamp-2">
                          {p.name}
                        </h4>
                        {p.sku && <p className="text-[10px] font-mono text-zinc-400 mt-0.5">SKU: {p.sku}</p>}
                      </div>

                      <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <span className="font-black text-sm text-black">
                          ₹{p.selling_price?.toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          disabled={isOut}
                          className="bg-black hover:bg-zinc-800 disabled:bg-zinc-200 text-white p-1.5 rounded-lg shadow-xs transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && !loading && (
                  <div className="col-span-full py-16 text-center text-zinc-400 text-sm font-medium">
                    No products found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Keyboard Guide Strip */}
            <div className="px-4 py-2 bg-white border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500 font-medium shrink-0">
              <div className="flex items-center gap-3">
                <span><kbd className="bg-zinc-100 border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold">/</kbd> Search</span>
                <span><kbd className="bg-zinc-100 border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold">F2</kbd> New Bill</span>
                <span><kbd className="bg-zinc-100 border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold">F4</kbd> Customer</span>
                <span><kbd className="bg-zinc-100 border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold">F8</kbd> Payment</span>
                <span><kbd className="bg-zinc-100 border border-zinc-300 rounded px-1.5 py-0.5 text-[10px] font-bold">F10</kbd> Complete & Print</span>
              </div>
              <div className="font-bold tracking-widest text-[10px]">WOODEX ATELIER POS</div>
            </div>
          </div>

          {/* RIGHT COLUMN: CURRENT BILL & CHECKOUT PANEL */}
          <div className="w-full md:w-[480px] lg:w-[520px] bg-white flex flex-col h-full overflow-hidden border-l border-zinc-200 shadow-xl">
            {/* Header: Customer Selection Bar */}
            <div className="p-4 bg-black text-white border-b border-zinc-800 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-white" />
                  <span className="font-black text-sm tracking-wider uppercase">ACTIVE BILLING COUNTER</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetBill}
                    className="text-[11px] font-bold text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-900 transition cursor-pointer"
                  >
                    Reset (F2)
                  </button>
                  <button
                    onClick={handleHoldBill}
                    className="text-[11px] font-bold text-white px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Hold</span>
                  </button>
                </div>
              </div>

              {/* Customer Selector / Selected Banner */}
              {selectedCustomer ? (
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block">
                      Customer Selected
                    </span>
                    <div className="font-extrabold text-white text-sm flex items-center gap-2">
                      <span>{selectedCustomer.name}</span>
                      {selectedCustomer.phone && selectedCustomer.phone !== '0000000000' && (
                        <span className="text-xs font-normal text-zinc-400">📞 {selectedCustomer.phone}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearchQuery('');
                    }}
                    className="text-xs text-white font-bold px-2 py-1 rounded hover:bg-zinc-800 transition cursor-pointer underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        ref={customerSearchRef}
                        type="text"
                        value={customerSearchQuery}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        placeholder="Select customer by name / phone (F4)..."
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                      />
                    </div>
                    <button
                      onClick={() => setIsQuickCustomerOpen(true)}
                      className="p-1.5 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition shadow-xs"
                      title="Add New Customer"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedCustomer({
                          name: 'Walk-in Customer',
                          phone: '0000000000',
                          address: '',
                        })
                      }
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap border border-zinc-800"
                    >
                      Walk-in
                    </button>
                  </div>

                  {/* Customer Dropdown Results */}
                  {isCustomerDropdownOpen && customerSearchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-zinc-200 z-50 max-h-48 overflow-y-auto text-black">
                      {filteredCustomers.slice(0, 8).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsCustomerDropdownOpen(false);
                            setCustomerSearchQuery('');
                          }}
                          className="px-3.5 py-2 hover:bg-zinc-100 cursor-pointer border-b border-zinc-100 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-black">{c.name}</div>
                            <div className="text-[11px] text-zinc-500">{c.phone}</div>
                          </div>
                          {c.pending_balance > 0 && (
                            <span className="text-[10px] font-bold text-black bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 rounded">
                              Due: ₹{c.pending_balance}
                            </span>
                          )}
                        </div>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="p-3 text-center text-zinc-400 text-xs">
                          No matching customer. Click '+' to add.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sale Type Selector */}
              <div className="flex bg-zinc-900 p-1 rounded-xl gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSaleType('direct_sale')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    saleType === 'direct_sale'
                      ? 'bg-white text-black shadow-xs font-extrabold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Direct Sale (Immediate)
                </button>
                <button
                  type="button"
                  onClick={() => setSaleType('customer_order')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    saleType === 'customer_order'
                      ? 'bg-white text-black shadow-xs font-extrabold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Customer Order (Furniture)
                </button>
              </div>
            </div>

            {/* Scrollable Bill Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Customer Order Configuration Section */}
              {saleType === 'customer_order' && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-black uppercase tracking-wider text-[10px]">
                      Future Furniture Delivery Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomSpecsOpen(!customSpecsOpen)}
                      className="text-black font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Custom Specs</span>
                      {customSpecsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-zinc-700 mb-0.5">Expected Delivery Date *</label>
                      <input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-zinc-700 mb-0.5">Delivery Address</label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Street, City, Pincode"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>

                  {/* Collapsible Custom Specifications */}
                  {customSpecsOpen && (
                    <div className="pt-2 border-t border-zinc-200 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-zinc-600 mb-0.5">Dimensions</label>
                        <input
                          type="text"
                          placeholder="e.g. 6x3 ft / 78x72 in"
                          value={customSpecs.dimensions}
                          onChange={(e) => setCustomSpecs({ ...customSpecs, dimensions: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-zinc-600 mb-0.5">Wood / Timber Type</label>
                        <input
                          type="text"
                          placeholder="e.g. Teak, Sheesham, Oak"
                          value={customSpecs.wood_type}
                          onChange={(e) => setCustomSpecs({ ...customSpecs, wood_type: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-zinc-600 mb-0.5">Wood Finish / Polish</label>
                        <input
                          type="text"
                          placeholder="e.g. Walnut Matte, Natural Gloss"
                          value={customSpecs.finish}
                          onChange={(e) => setCustomSpecs({ ...customSpecs, finish: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-zinc-600 mb-0.5">Fabric & Colour</label>
                        <input
                          type="text"
                          placeholder="e.g. Beige Suede / Grey Velvet"
                          value={customSpecs.fabric}
                          onChange={(e) => setCustomSpecs({ ...customSpecs, fabric: e.target.value })}
                          className="w-full px-2 py-1 bg-white border border-zinc-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Items List Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">
                  <span>Selected Products ({cartItems.length})</span>
                  <span>Amount</span>
                </div>

                {cartItems.map((item, idx) => {
                  const lineTotal = Math.max(0, item.quantity * item.unit_price - (item.discount || 0));
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100/80 rounded-xl border border-zinc-200 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h5 className="font-bold text-black text-xs leading-snug">{item.product_name}</h5>
                          {item.sku && <span className="text-[10px] font-mono text-zinc-400">SKU: {item.sku}</span>}
                        </div>
                        <button
                          onClick={() => removeCartItem(idx)}
                          className="text-zinc-400 hover:text-black p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity & Price Controls */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(idx, -1)}
                            className="p-1 rounded bg-white border border-zinc-300 hover:bg-zinc-100 text-black font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-bold text-xs text-black">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(idx, 1)}
                            className="p-1 rounded bg-white border border-zinc-300 hover:bg-zinc-100 text-black font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Unit Price input */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">@ ₹</span>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateCartPrice(idx, Number(e.target.value))}
                            className="w-20 px-1.5 py-0.5 bg-white border border-zinc-300 rounded text-right text-xs font-semibold focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                          />
                          <span className="font-black text-sm text-black w-20 text-right">
                            ₹{lineTotal.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cartItems.length === 0 && (
                  <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-300 text-zinc-400 text-xs">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40 text-black" />
                    <span>No products added yet. Click a product on the left to begin.</span>
                  </div>
                )}
              </div>

              {/* Bill Discounts & Tax Configuration */}
              {cartItems.length > 0 && (
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-zinc-700">Bill Discount:</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={discountType}
                        onChange={(e: any) => setDiscountType(e.target.value)}
                        className="px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-medium"
                      >
                        <option value="fixed">Fixed ₹</option>
                        <option value="percentage">Percent %</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={billDiscount}
                        onChange={(e) => setBillDiscount(Number(e.target.value))}
                        className="w-20 px-2 py-1 bg-white border border-zinc-300 rounded text-right text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200">
                    <label className="font-bold text-zinc-700">GST / Tax:</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="px-2 py-1 bg-white border border-zinc-300 rounded text-xs font-semibold"
                      >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST (Standard)</option>
                        <option value={28}>28% GST</option>
                      </select>
                      <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-zinc-700">
                        <input
                          type="checkbox"
                          checked={taxInclusive}
                          onChange={(e) => setTaxInclusive(e.target.checked)}
                          className="rounded text-black focus:ring-black"
                        />
                        <span>Inclusive</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Summary & Payment Section */}
            <div className="p-4 bg-white border-t border-zinc-200 space-y-3.5 shadow-2xl shrink-0">
              {/* Financial Calculation Row */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-black">₹{rawSubtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-black font-medium">
                    <span>Discount:</span>
                    <span className="font-semibold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>GST ({taxRate}%):</span>
                    <span className="font-semibold text-black">₹{taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-black pt-1.5 border-t border-zinc-200">
                  <span>Grand Total:</span>
                  <span className="text-lg text-black">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 space-y-2.5">
                {/* Method Pills */}
                <div className="flex gap-1 text-[11px] font-bold">
                  {['cash', 'upi', 'card', 'bank_transfer'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-1 rounded-lg uppercase transition ${
                        paymentMethod === m
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Amount Paid & Balance Due */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-zinc-500 mb-0.5">
                      <span>Paid / Tendered (₹)</span>
                      <button
                        type="button"
                        onClick={setFullPayment}
                        className="text-black font-bold underline"
                      >
                        Full (₹{grandTotal})
                      </button>
                    </div>
                    <input
                      ref={paidInputRef}
                      type="number"
                      min={0}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-sm font-black text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div className="w-1/3 bg-white p-2 rounded-lg border border-zinc-200 text-right">
                    <span className="text-[10px] font-extrabold uppercase text-black block">Balance Due</span>
                    <span className="font-black text-sm text-black">₹{balanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {checkoutError && (
                <div className="p-2.5 bg-zinc-900 border border-zinc-700 text-white rounded-xl text-xs font-medium">
                  {checkoutError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={checkingOut || cartItems.length === 0}
                  onClick={() => handleCheckout(false)}
                  className="w-1/3 py-3 bg-zinc-100 hover:bg-zinc-200 text-black font-bold rounded-xl text-xs uppercase tracking-wider transition border border-zinc-300 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Only</span>
                </button>

                <button
                  type="button"
                  disabled={checkingOut || cartItems.length === 0}
                  onClick={() => handleCheckout(true)}
                  className="w-2/3 py-3 bg-black hover:bg-zinc-800 text-white font-black rounded-xl text-xs uppercase tracking-widest transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>
                        {saleType === 'direct_sale' ? 'Complete Sale & Print' : 'Create Order & Print'} (F10)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Quick Customer Modal */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        onSuccess={(cust) => {
          setCustomers((prev) => [cust, ...prev]);
          setSelectedCustomer(cust);
        }}
      />

      {/* Order Lookup & Payment Modal */}
      <CounterOrderLookupModal
        isOpen={isOrderLookupOpen}
        onClose={() => setIsOrderLookupOpen(false)}
        business={me?.business}
      />

      {/* Print Invoice Modal */}
      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={completedInvoice}
        order={completedOrder}
        business={me?.business}
      />

      {/* Held Bills Drawer / Modal */}
      {isHeldBillsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-zinc-300">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-black" />
                <h3 className="font-black text-base text-black uppercase tracking-wider">Held Counter Bills</h3>
              </div>
              <button onClick={() => setIsHeldBillsDrawerOpen(false)} className="text-zinc-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {heldBills.map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-xs text-black">{h.hold_label}</h5>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Held on {new Date(h.created_at).toLocaleTimeString()}</p>
                  </div>
                  <button
                    onClick={() => handleResumeBill(h)}
                    className="flex items-center gap-1 bg-black hover:bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer uppercase tracking-wider"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                </div>
              ))}

              {heldBills.length === 0 && (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No held bills found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
