import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  FileText,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

const capabilities = [
  {
    label: 'Sell',
    title: 'From quote to paid order',
    description: 'Run counter sales, create quotations and issue invoices without switching tools.',
    icon: ReceiptText,
    details: ['Point of sale', 'Orders', 'Invoices'],
  },
  {
    label: 'Manage',
    title: 'Know what is in stock',
    description: 'Keep products, timber specifications, stock levels and supplier purchases together.',
    icon: Boxes,
    details: ['Products', 'Inventory', 'Purchasing'],
  },
  {
    label: 'Deliver',
    title: 'Keep every promise visible',
    description: 'Follow customers and orders from approval through workshop progress to delivery.',
    icon: Truck,
    details: ['Customers', 'Production', 'Delivery'],
  },
];

const workflow = [
  { step: '01', label: 'Quote', detail: 'Price the right material and dimensions.', icon: FileText },
  { step: '02', label: 'Sell', detail: 'Turn approval into an order or counter sale.', icon: ShoppingBag },
  { step: '03', label: 'Prepare', detail: 'Track stock, purchasing and workshop progress.', icon: PackageCheck },
  { step: '04', label: 'Deliver', detail: 'Dispatch, collect payment and close the order.', icon: Truck },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#0b0b0a] text-[#f4f1eb] antialiased selection:bg-[#d6b48d] selection:text-[#17120e]">
      <PublicNavbar />

      <main>
        <section className="border-b border-white/10">
          <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1440px] lg:grid-cols-[0.86fr_1.14fr]">
            <div className="flex items-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-20">
              <div className="max-w-[620px]">
                <p className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c9c3b8] sm:text-xs">
                  <span className="h-px w-8 bg-[#9c6d45]" aria-hidden="true" />
                  Furniture business management software
                </p>

                <h1 className="max-w-[11ch] font-serif text-[clamp(3.15rem,6.7vw,6.5rem)] font-medium leading-[0.94] tracking-[-0.055em] text-[#f7f4ee]">
                  Run your furniture business from one place.
                </h1>

                <p className="mt-7 max-w-xl text-base leading-7 text-[#aaa69f] sm:mt-8 sm:text-lg sm:leading-8">
                  Manage sales, inventory, quotations, purchases and delivery with one simple workspace.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-5">
                  <Link
                    href="/register"
                    className="group inline-flex min-h-12 items-center justify-center gap-3 bg-[#f4f1eb] px-6 text-sm font-bold text-[#11110f] transition-colors hover:bg-[#d6b48d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a] active:bg-[#c49c70]"
                  >
                    Create account
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="#workflow"
                    className="inline-flex min-h-12 items-center border-b border-[#8d8982] text-sm font-semibold text-[#d9d5ce] transition-colors hover:border-[#d6b48d] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]"
                  >
                    See how it works
                  </Link>
                </div>

                <div className="mt-14 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-6 text-sm text-[#aaa69f] sm:grid-cols-3">
                  <span className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-[#bd8b5f]" aria-hidden="true" /> POS & sales</span>
                  <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-[#bd8b5f]" aria-hidden="true" /> Live stock</span>
                  <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-[#bd8b5f]" aria-hidden="true" /> Delivery</span>
                </div>
              </div>
            </div>

            <div className="relative min-h-[430px] overflow-hidden border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0">
              <Image
                src="/images/woodex-showroom-workshop.png"
                alt="A modern furniture showroom connected to an active timber workshop"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 58vw"
                className="object-cover object-[62%_center] transition-transform duration-700 ease-out hover:scale-[1.015]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15 lg:bg-gradient-to-r lg:from-[#0b0b0a]/30 lg:via-transparent lg:to-transparent" aria-hidden="true" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between border-t border-white/40 pt-4 text-white sm:bottom-8 sm:left-8 sm:right-8">
                <p className="max-w-[20rem] text-xs font-medium leading-5 text-white/85">
                  Built around the way showrooms, workshops and timber teams actually work.
                </p>
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-white/70 sm:block">Showroom ↔ Workshop</span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 bg-[#f1ede5] text-[#171614]">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-20">
            <div className="grid gap-8 border-b border-black/15 pb-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#775438]">One clear view</p>
              <h2 className="max-w-3xl font-serif text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Everything needed to move an order forward.
              </h2>
            </div>

            <div className="grid lg:grid-cols-3">
              {capabilities.map((capability, index) => {
                const Icon = capability.icon;
                return (
                  <article
                    key={capability.label}
                    className={`py-10 lg:px-8 lg:py-12 ${index > 0 ? 'border-t border-black/15 lg:border-l lg:border-t-0' : ''} ${index === 0 ? 'lg:pl-0' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#775438]">{capability.label}</p>
                      <Icon className="h-5 w-5 text-[#775438]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-10 max-w-[15ch] text-2xl font-semibold tracking-[-0.025em]">{capability.title}</h3>
                    <p className="mt-4 max-w-sm text-[15px] leading-7 text-[#656159]">{capability.description}</p>
                    <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/10 pt-5 text-xs font-semibold text-[#4d4942]" aria-label={`${capability.label} features`}>
                      {capability.details.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 border-y border-white/10 bg-[#11110f]">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-20">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#bd8b5f]">A simpler workflow</p>
              <div>
                <h2 className="max-w-3xl font-serif text-4xl leading-[1.03] tracking-[-0.035em] sm:text-5xl lg:text-6xl">From first quote to final delivery.</h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[#a7a29a]">Every team works from the same order, so the counter, stockroom and workshop stay in step.</p>
              </div>
            </div>

            <ol className="mt-14 grid border-t border-white/15 md:grid-cols-2 lg:grid-cols-4">
              {workflow.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={item.step} className={`relative py-8 md:px-7 lg:min-h-64 lg:py-9 ${index > 0 ? 'border-t border-white/15 md:border-l md:border-t-0' : ''} ${index === 2 ? 'md:border-l-0 lg:border-l' : ''} ${index === 0 ? 'md:pl-0' : ''}`}>
                    <div className="flex items-center justify-between text-[#857f76]">
                      <span className="font-mono text-xs">{item.step}</span>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-12 text-2xl font-semibold tracking-[-0.02em] text-[#f4f1eb]">{item.label}</h3>
                    <p className="mt-3 max-w-[16rem] text-sm leading-6 text-[#9f9a92]">{item.detail}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="bg-[#0b0b0a]">
          <div className="mx-auto grid max-w-[1440px] gap-9 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 xl:px-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#bd8b5f]">Ready when you are</p>
              <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.03] tracking-[-0.035em] sm:text-5xl lg:text-6xl">A better way to run the work behind the furniture.</h2>
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
              <Link href="/register" className="group inline-flex min-h-12 items-center justify-center gap-3 bg-[#f4f1eb] px-6 text-sm font-bold text-[#11110f] transition-colors hover:bg-[#d6b48d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a] active:bg-[#c49c70]">
                Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center px-6 text-sm font-semibold text-[#d7d2ca] transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4f1eb] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0a]">
                Already use Woodex? Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
