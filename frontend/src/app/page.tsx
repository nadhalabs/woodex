import React from 'react';
import Link from 'next/link';
import {
  Package,
  Boxes,
  Users,
  ShoppingBag,
  FileText,
  Building2,
  Store,
  UserCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Layers,
  Sparkles,
  Printer,
  Shield,
  HelpCircle,
  Truck,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

export default function HomePage() {
  const coreFeatures = [
    {
      icon: Package,
      title: 'Products & Wood Catalog',
      badge: 'Dimensions & Specs',
      description:
        'Catalog furniture pieces with precise dimensions (L × W × H), timber species (Teak, Oak, Walnut, Sheesham, Plywood), surface finishes, fabric options, and SKU variants.',
    },
    {
      icon: Boxes,
      title: 'Live Inventory & Stock Alerts',
      badge: 'Stock Levels',
      description:
        'Track on-hand stock across finished goods and raw materials. Receive immediate low-stock indicators before showroom items run out of stock.',
    },
    {
      icon: Users,
      title: 'Customer Directory & Accounts',
      badge: 'Client History',
      description:
        'Maintain complete customer profiles, shipping/site addresses, previous furniture purchases, outstanding balances, and customized discount rates.',
    },
    {
      icon: ShoppingBag,
      title: 'Orders & Production Tracking',
      badge: 'Lifecycle Pipeline',
      description:
        'Manage end-to-end sales orders through clear production stages: Pending, Confirmed, In Production, Ready for Delivery, and Delivered.',
    },
    {
      icon: FileText,
      title: 'Custom Quotations',
      badge: '1-Click Order Convert',
      description:
        'Draft professional, itemized estimates for custom architectural furniture. Include material breakdowns and terms, then convert directly into confirmed sales orders.',
    },
    {
      icon: Store,
      title: 'Fast Counter POS & Billing',
      badge: 'Retail Checkout',
      description:
        'Designed for high-speed showroom checkout. Instant product lookup, split payments (Cash, Card, UPI), and print-ready thermal or A4 tax invoices.',
    },
    {
      icon: Building2,
      title: 'Purchases & Suppliers',
      badge: 'Procurement',
      description:
        'Record timber log deliveries, hardware purchases, and fabric supplies. Track supplier payment terms, outstanding payables, and incoming purchase orders.',
    },
    {
      icon: UserCheck,
      title: 'Staff & Role-Based Access',
      badge: 'Access Control',
      description:
        'Granular permission tiers for Store Owners, Managers, and Sales Staff. Keep counter personnel focused on sales while protecting business financial records.',
    },
    {
      icon: BarChart3,
      title: 'Reports & Revenue Analytics',
      badge: 'Real-Time Insights',
      description:
        'Understand your showroom performance with revenue breakdowns, top-selling wood items, outstanding receivables, operating expense margins, and tax summaries.',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Catalog Setup & Timber Specifications',
      description:
        'Add furniture items with detailed wood species, custom dimensions, finishes, and unit prices. Configure stock levels and supplier links.',
      icon: Layers,
    },
    {
      step: '02',
      title: 'Consultation & Quotation Generation',
      description:
        'Generate structured estimates for clients with customized dimensions and fabric choices. Calculate taxes, discounts, and validity periods instantly.',
      icon: FileText,
    },
    {
      step: '03',
      title: 'Order Confirmation & Workshop Production',
      description:
        'Convert accepted estimates into active sales orders. Track workshop progress, allocate inventory, and record advance deposit payments.',
      icon: SlidersHorizontal,
    },
    {
      step: '04',
      title: 'Counter Billing, Payment & Dispatch',
      description:
        'Settle balances at the counter or complete fast walk-in retail sales. Print thermal/A4 receipts and coordinate customer deliveries with driver logs.',
      icon: Printer,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-white selection:text-black">
      {/* Public Navigation */}
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-zinc-900">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-zinc-800/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Top Industry Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-300 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Furniture Showroom & Atelier Operating System</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase leading-[1.1]">
              Purpose-built software for furniture & timber businesses
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-lg text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto">
              Manage custom wood specifications, quotation-to-order workflows, showroom counter billing, timber supplier purchasing, and delivery tracking in one unified workspace.
            </p>

            {/* Hero CTAs */}
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-zinc-200 text-black font-black text-xs sm:text-sm uppercase tracking-widest py-3.5 px-8 rounded-xl shadow-xl transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white"
              >
                <span>Sign In to Store</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 font-bold text-xs sm:text-sm uppercase tracking-widest py-3.5 px-7 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Explore Features</span>
              </Link>
            </div>

            {/* Verified Architectural Highlights */}
            <div className="mt-12 pt-8 border-t border-zinc-900/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Point of Sale</div>
                <div className="mt-1 text-xs font-semibold text-zinc-200">Fast Counter & Split Tender</div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Timber Details</div>
                <div className="mt-1 text-xs font-semibold text-zinc-200">Dimensions & Wood Species</div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Quotations</div>
                <div className="mt-1 text-xs font-semibold text-zinc-200">1-Click Order Conversion</div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-900">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Tenant Safety</div>
                <div className="mt-1 text-xs font-semibold text-zinc-200">Multi-Tenant Isolation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Realistic System Interface Preview Card */}
      <section className="py-14 sm:py-20 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl border border-zinc-800 bg-black p-5 sm:p-8 lg:p-10 shadow-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-zinc-900">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 mb-2">
                  <span>Showroom Operations Workspace</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  Connected from Front Counter to Workshop
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl">
                  Thermal & A4 Invoices
                </span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
                  Multi-Role Security
                </span>
              </div>
            </div>

            {/* Interface Cards Mockup Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Counter POS */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Counter POS</span>
                  <Store className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-black border border-zinc-900">
                    <span className="font-semibold text-zinc-200">Teak Dining Table (6-Seater)</span>
                    <span className="font-bold text-white">₹42,000</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 rounded-xl bg-black border border-zinc-900">
                    <span className="font-semibold text-zinc-200">Solid Oak Armchair × 2</span>
                    <span className="font-bold text-white">₹18,500</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium">Split Tender</span>
                  <span className="text-[11px] font-bold text-zinc-300 uppercase">Cash + UPI</span>
                </div>
              </div>

              {/* Card 2: Custom Quotations */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Custom Quotation</span>
                  <FileText className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black border border-zinc-900 space-y-1">
                    <div className="flex justify-between font-semibold text-zinc-200">
                      <span>Walnut Wall Cabinet</span>
                      <span className="text-emerald-400 font-bold">Approved</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">Spec: 2100mm × 900mm × 450mm • Matte Finish</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-900 flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-medium">Status Action</span>
                  <span className="text-[11px] font-black text-white bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800 uppercase">
                    Convert to Order →
                  </span>
                </div>
              </div>

              {/* Card 3: Live Order Status */}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Order Pipeline</span>
                  <ShoppingBag className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-black border border-zinc-900 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-zinc-200">ORD-2026-084</div>
                      <div className="text-[10px] text-zinc-400">Customer: Ananya Sharma</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50 uppercase">
                      In Production
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black border border-zinc-900 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-zinc-200">ORD-2026-085</div>
                      <div className="text-[10px] text-zinc-400">Customer: Vikram Roy</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-300 border border-blue-800/50 uppercase">
                      Ready for Dispatch
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-16 sm:py-24 border-b border-zinc-900 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Complete Feature Suite
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
              Engineered for every corner of your furniture operation
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-400 font-medium">
              Eliminate disjointed systems. Woodex bridges showroom sales, material purchases, custom quotations, and workshop delivery in one robust tool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-700 transition group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition shadow-sm">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Store Workflow Lifecycle Section */}
      <section id="workflow" className="py-16 sm:py-24 bg-zinc-950 border-b border-zinc-900 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
              End-to-End Workflow
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
              How furniture orders flow through Woodex
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-400 font-medium">
              From the moment a customer walks into the showroom or requests a custom timber quote to delivery completion and final payment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="rounded-2xl bg-black border border-zinc-800 p-6 flex flex-col justify-between space-y-6 relative"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black text-zinc-600 font-mono">
                        {step.step}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="text-base font-black text-white tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-xs text-zinc-400 font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Workflow Stage</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Architecture Banner */}
      <section className="py-16 sm:py-20 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-black p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  Tenant Isolation
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every business space operates with isolated tenant keys and secure credential sessions to safeguard pricing, customer data, and sales turnover.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                  <Printer className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  Retail Hardware Compatible
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Standard browser printing works with thermal POS receipt printers (58mm/80mm) as well as formal A4/A5 tax invoices.
                </p>
              </div>

              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white tracking-tight">
                  Dispatch & Delivery Ready
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Assign drivers, generate dispatch notes, and record partial/full cash-on-delivery payments seamlessly upon customer handover.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Call to Action Section */}
      <section className="py-20 sm:py-24 bg-black text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black mx-auto shadow-2xl text-lg tracking-tighter">
            WX
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white uppercase leading-tight">
            Ready to streamline your furniture business?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 font-medium max-w-xl mx-auto leading-relaxed">
            Sign in with your store credentials to access the counter terminal, manage active orders, and view your store analytics.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-zinc-200 text-black font-black text-xs sm:text-sm uppercase tracking-widest py-3.5 px-8 rounded-xl shadow-2xl transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white"
            >
              <span>Sign In to Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/faq"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 font-bold text-xs sm:text-sm uppercase tracking-widest py-3.5 px-7 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Read Store FAQ</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <PublicFooter />
    </div>
  );
}
