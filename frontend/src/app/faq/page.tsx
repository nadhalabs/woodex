'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ArrowRight,
  HelpCircle,
  Package,
  FileText,
  Store,
  Building2,
  UserCheck,
  Shield,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqData: FaqItem[] = [
  {
    id: 'what-is-woodex',
    category: 'Overview',
    question: 'What is Woodex?',
    answer:
      'Woodex is a business management operating system engineered specifically for furniture stores, custom timber ateliers, and showroom businesses. It connects catalog management, custom dimensions, quotation estimates, sales orders, counter POS billing, raw material purchasing, and delivery dispatch into a single unified platform.',
  },
  {
    id: 'who-is-it-for',
    category: 'Overview',
    question: 'Who is Woodex designed for?',
    answer:
      'Woodex is tailored for furniture retail showrooms, custom woodcraft studios, interior joinery workshops, timber merchants, and multi-staff furniture retailers who need to track custom dimensions, workshop production progress, counter payments, and supplier procurement.',
  },
  {
    id: 'products-and-inventory',
    category: 'Products & Inventory',
    question: 'How does Woodex handle custom furniture dimensions and wood species?',
    answer:
      'Every product in Woodex can be cataloged with detailed attributes including wood types (e.g. Teak, Oak, Walnut, Sheesham, Plywood), length × width × height dimensions, surface finishes, fabric options, unit costs, and retail prices. In addition, real-time inventory tracking monitors on-hand stock and flags low-stock warnings.',
  },
  {
    id: 'quotations-and-orders',
    category: 'Quotations & Orders',
    question: 'How does the custom quotation and order workflow work?',
    answer:
      'When clients request custom furniture or architectural woodwork, staff can generate itemized quotations with specifications, taxes, and validity terms. Once the customer approves, the quotation can be converted into an active sales order with a single click, allowing your workshop to track production from Pending through In Production to Ready for Delivery.',
  },
  {
    id: 'counter-billing',
    category: 'Billing & POS',
    question: 'How does in-store counter billing (POS) operate?',
    answer:
      'The dedicated Counter module allows fast walk-in retail billing. Counter staff can quickly search products by name or SKU, adjust quantities and item discounts, accept single or split payment tenders (Cash, Card, UPI), and immediately trigger thermal receipt printing (58mm/80mm) or standard A4 tax invoice generation.',
  },
  {
    id: 'purchases-and-suppliers',
    category: 'Procurement',
    question: 'Can I manage raw timber purchases and suppliers in Woodex?',
    answer:
      'Yes. Woodex includes dedicated Supplier and Purchase Order modules. You can log supplier contact records, record incoming raw timber deliveries, track hardware and fabric procurement costs, and review outstanding vendor payables.',
  },
  {
    id: 'staff-access-roles',
    category: 'Staff & Roles',
    question: 'How does staff access control work?',
    answer:
      'Woodex supports role-based authorization tiers (Store Owner, Store Manager, and Sales/Counter Staff). Counter personnel have access to fast retail checkout and order lookup while sensitive business settings, profit margins, and financial reports remain restricted to owners and managers.',
  },
  {
    id: 'devices-and-browsers',
    category: 'Usability',
    question: 'Can Woodex be accessed on mobile devices and tablets?',
    answer:
      'Yes. Woodex is built with responsive web architecture and runs in any modern web browser across desktop computers, tablets (such as iPads or Android tablets used on the showroom floor), and mobile phones. Hardware features like fullscreen mode and browser printing are supported directly.',
  },
  {
    id: 'data-security',
    category: 'Security',
    question: 'How is store data isolated and protected?',
    answer:
      'Each business space in Woodex operates within an isolated tenant structure. All authenticated API requests require verified tokens, and your store catalog, customer lists, financial turnover, and invoice logs are isolated to your business account.',
  },
  {
    id: 'getting-started-support',
    category: 'Getting Started',
    question: 'How do I get started with my store account?',
    answer:
      'To access your store, navigate to the Sign In page using your assigned business credentials. Once signed in, you can configure your store profile, tax information, currency, and start populating your product categories and customer accounts.',
  },
];

export default function FaqPage() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'what-is-woodex': true,
    'who-is-it-for': true,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Overview', 'Products & Inventory', 'Quotations & Orders', 'Billing & POS', 'Procurement', 'Staff & Roles', 'Usability', 'Security', 'Getting Started'];

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = selectedCategory === 'All'
    ? faqData
    : faqData.filter((item) => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-black text-white antialiased selection:bg-white selection:text-black">
      <PublicNavbar />

      {/* FAQ Header */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-18 sm:pb-24 border-b border-zinc-900">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-zinc-800/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-950 text-zinc-300 text-xs font-bold uppercase tracking-widest mb-6">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-300" />
            <span>Store Knowledge & FAQ</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase leading-tight">
            Frequently Asked Questions
          </h1>

          <p className="mt-4 text-base sm:text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about managing furniture inventory, custom quotations, counter billing, and staff permissions in Woodex.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-widest py-3 px-6 rounded-xl shadow-lg transition active:scale-[0.98]"
            >
              <span>Sign In to Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-bold uppercase tracking-widest py-3 px-5 rounded-xl transition"
            >
              <span>Return Home</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Category Filter & Accordion Section */}
      <section className="py-14 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12" role="tablist" aria-label="FAQ Categories">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-white text-black font-black shadow-md'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq) => {
            const isOpen = Boolean(openItems[faq.id]);
            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-zinc-950 border border-zinc-800/90 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  id={`faq-question-${faq.id}`}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-zinc-900/40 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <div className="flex items-start sm:items-center gap-3.5 pr-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800 shrink-0">
                      {faq.category}
                    </span>
                    <span className="text-base sm:text-lg font-black text-white tracking-tight">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-white' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${faq.id}`}
                    role="region"
                    aria-labelledby={`faq-question-${faq.id}`}
                    className="px-5 sm:px-6 pb-6 pt-2 text-sm text-zinc-300 font-medium leading-relaxed border-t border-zinc-900/80 bg-black/40"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions card */}
        <div className="mt-14 p-8 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-4">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">
            Looking for something else?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium max-w-md mx-auto leading-relaxed">
            Access your store terminal to view live data, generate new estimates, or manage showroom staff accounts.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-widest py-3 px-6 rounded-xl shadow-lg transition"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
