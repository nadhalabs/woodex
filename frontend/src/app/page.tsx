import Link from 'next/link';
import {
  Armchair,
  ArrowRight,
  Boxes,
  FileText,
  MousePointer2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { PublicFooter } from '@/components/public/PublicFooter';

const strengths = [
  { title: 'Furniture-first', detail: 'Workflows shaped for showrooms, stockrooms and daily sales.', icon: Armchair },
  { title: 'Easy to use', detail: 'Clear screens that help every team member work confidently.', icon: MousePointer2 },
  { title: 'Always connected', detail: 'Sales, inventory and purchasing stay aligned as work moves.', icon: RefreshCw },
  { title: 'Role-ready access', detail: 'Focused access for owners, managers and staff.', icon: ShieldCheck },
];

const capabilities = [
  { label: 'Sell', title: 'From quote to paid order', description: 'Create quotations, orders and invoices without switching tools.' },
  { label: 'Manage', title: 'Know what is in stock', description: 'Products, stock and purchasing stay connected.' },
  { label: 'Deliver', title: 'Keep every order visible', description: 'Track customers and orders through delivery.' },
];

const paperTexture = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520"><filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".055 .32" numOctaves="5" seed="19" stitchTiles="stitch"/><feComponentTransfer><feFuncR type="linear" slope=".026" intercept=".932"/><feFuncG type="linear" slope=".026" intercept=".916"/><feFuncB type="linear" slope=".026" intercept=".889"/></feComponentTransfer></filter><rect width="520" height="520" filter="url(#paper)"/></svg>`;
const paperBackground = {
  backgroundColor: '#f1ede6',
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(paperTexture)}")`,
  backgroundSize: '520px 520px',
} as const;

const primaryLink = 'group inline-flex min-h-12 items-center justify-center gap-3 border border-[#b91c32] bg-[#b91c32] px-6 text-sm font-semibold text-[#fff1f0] transition-colors hover:border-[#9f172a] hover:bg-[#9f172a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c32] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f1ede6] active:bg-[#851322]';

function SalesPreview() {
  return (
    <div className="mt-8 flex-1 overflow-hidden rounded-[3px] border border-[#1b1a18]/20 bg-[#e8e3da]" aria-hidden="true">
      <div className="flex h-10 items-center justify-between border-b border-[#1b1a18]/15 bg-[#1b1a18] px-4 text-[#f1ede6]">
        <span className="text-[9px] font-bold tracking-[0.18em]">WOODEX</span>
        <span className="text-[9px] text-[#aaa59d]">COUNTER</span>
      </div>
      <div className="grid min-h-64 grid-cols-[78px_1fr] sm:grid-cols-[118px_1fr]">
        <div className="border-r border-[#1b1a18]/15 bg-[#ded8ce] p-3 sm:p-4">
          <div className="h-1.5 w-10 bg-[#1b1a18]" />
          <div className="mt-7 space-y-4 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#5f5a52] sm:text-[9px]">
            <p className="text-[#1b1a18]">Counter</p>
            <p>Orders</p>
            <p>Invoices</p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Current sale</span>
            <span className="border border-[#1b1a18]/20 px-2 py-1 text-[8px] font-semibold">New order</span>
          </div>
          <div className="mt-6 space-y-3">
            {['Quotation', 'Order', 'Invoice'].map((item, index) => (
              <div key={item} className="flex items-center justify-between border-b border-[#1b1a18]/15 pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center border border-[#1b1a18]/20 bg-[#f1ede6]">
                    {index === 0 ? <FileText className="h-3.5 w-3.5" /> : <ReceiptText className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-[10px] font-semibold sm:text-xs">{item}</span>
                </div>
                <span className="text-[9px] text-[#6d675f]">Connected</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationsPreview() {
  return (
    <div className="mt-8 flex-1 overflow-hidden rounded-[3px] border border-[#1b1a18]/20 bg-[#e8e3da]" aria-hidden="true">
      <div className="flex h-10 items-center justify-between border-b border-[#1b1a18]/15 bg-[#1b1a18] px-4 text-[#f1ede6]">
        <span className="text-[9px] font-bold tracking-[0.18em]">WOODEX</span>
        <span className="text-[9px] text-[#aaa59d]">OPERATIONS</span>
      </div>
      <div className="min-h-64 p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {['Products', 'Purchases', 'Delivery'].map((item) => (
            <div key={item} className="border border-[#1b1a18]/15 bg-[#f1ede6] px-2 py-4 sm:px-4">
              <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#6d675f] sm:text-[9px]">{item}</p>
              <div className="mt-5 h-px w-full bg-[#1b1a18]/20" />
              <div className="mt-2 h-px w-2/3 bg-[#1b1a18]/10" />
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-[#1b1a18]/20">
          {[
            { label: 'Products and stock', icon: Boxes },
            { label: 'Purchasing', icon: ReceiptText },
            { label: 'Order delivery', icon: Truck },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between border-b border-[#1b1a18]/15 py-3">
              <span className="flex items-center gap-3 text-[10px] font-semibold sm:text-xs"><Icon className="h-3.5 w-3.5" />{label}</span>
              <span className="h-1.5 w-10 bg-[#1b1a18]/25" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#f1ede6] text-[#1b1a18] antialiased selection:bg-[#1b1a18] selection:text-[#f1ede6]" style={paperBackground}>
      <PublicNavbar />

      <main>
        <section className="border-b border-[#1b1a18]/15">
          <div className="mx-auto flex min-h-[calc(100svh-72px)] max-w-[1440px] items-center px-5 py-16 sm:px-8 sm:py-24 lg:px-12 xl:px-20">
            <div className="mx-auto w-full max-w-[1120px] text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b91c32] sm:text-xs">Furniture business software</p>
              <h1 className="mx-auto mt-8 max-w-[12ch] font-serif text-[clamp(3.25rem,7.4vw,7rem)] font-normal leading-[0.96] tracking-[-0.055em] text-[#1b1a18]">Run your furniture business with clarity.</h1>
              <p className="mx-auto mt-8 max-w-2xl text-base leading-7 text-[#625e57] sm:text-lg sm:leading-8">Sales, inventory, quotations, purchasing and delivery — managed from one simple workspace.</p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
                <Link href="/register" className={`${primaryLink} w-full sm:w-auto`}>Create account<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
                <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center border border-[#202a38] bg-[#fff1f0] px-6 text-sm font-semibold text-[#202a38] transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#202a38] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f1ede6] active:bg-[#f4dfdf] sm:w-auto">Sign in</Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="why-woodex" className="border-b border-[#1b1a18]/15">
          <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28 xl:px-20">
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#b91c32]">Designed around the work</p>
              <h2 id="why-woodex" className="mx-auto mt-5 max-w-[18ch] font-serif text-4xl font-normal leading-[1.02] tracking-[-0.04em] text-[#202a38] sm:text-5xl lg:text-6xl">Why furniture teams choose Woodex.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[#68635c] sm:text-base sm:leading-7">A focused workspace that keeps everyday operations clear, connected and easier to manage.</p>
            </div>

            <div className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
              {strengths.map(({ title, detail, icon: Icon }) => (
                <article key={title} className="text-center">
                  <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-[#b91c32]/20 bg-[#fff1f0] text-[#202a38] sm:h-32 sm:w-32">
                    <Icon className="h-12 w-12 stroke-[1.25] sm:h-14 sm:w-14" aria-hidden="true" />
                  </div>
                  <h3 className="mt-7 text-lg font-semibold tracking-[-0.02em] text-[#202a38] sm:text-xl">{title}</h3>
                  <p className="mx-auto mt-3 max-w-[16rem] text-sm leading-6 text-[#68635c]">{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#1b1a18]/15">
          <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-20">
            <h2 className="border-b border-[#1b1a18]/20 pb-8 font-serif text-4xl font-normal leading-[1.04] tracking-[-0.04em] sm:text-5xl">Inside Woodex</h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <article className="flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] border-t-2 border-[#b91c32] bg-[#202a38] text-[#fff1f0]">
                    <ReceiptText className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-3xl font-normal tracking-[-0.03em]">Sales that stay connected</h3>
                </div>
                <SalesPreview />
              </article>
              <article className="flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[3px] border-t-2 border-[#b91c32] bg-[#202a38] text-[#fff1f0]">
                    <Boxes className="h-4 w-4 stroke-[1.5]" aria-hidden="true" />
                  </span>
                  <h3 className="font-serif text-3xl font-normal tracking-[-0.03em]">Know what is moving</h3>
                </div>
                <OperationsPreview />
              </article>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-b border-[#1b1a18]/15">
          <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24 xl:px-20">
            <div className="grid overflow-hidden rounded-[4px] border-t-4 border-[#b91c32] bg-[#202a38] text-[#f7f4ee] lg:grid-cols-3">
              {capabilities.map((capability, index) => (
                <article key={capability.label} className={`px-6 py-10 sm:px-8 sm:py-12 lg:min-h-80 lg:px-10 lg:py-14 ${index > 0 ? 'border-t border-[#fff1f0]/15 lg:border-l lg:border-t-0' : ''}`}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#fff1f0]">{capability.label}</p>
                  <h2 className="mt-12 max-w-[14ch] font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.035em] sm:text-[2.4rem]">{capability.title}</h2>
                  <p className="mt-5 max-w-sm text-[15px] leading-7 text-[#ded2d2]">{capability.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12 xl:px-20">
          <div className="mx-auto grid max-w-[1280px] overflow-hidden rounded-[4px] border border-[#202a38]/20 border-t-4 border-t-[#b91c32] bg-[#fff1f0] text-[#202a38] lg:grid-cols-[1.35fr_0.65fr]">
            <div className="px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
              <h2 className="max-w-[18ch] font-serif text-4xl font-normal leading-[1.04] tracking-[-0.04em] sm:text-5xl">Ready to run your business with less friction?</h2>
            </div>
            <div className="flex flex-col justify-center gap-3 px-6 pb-10 sm:flex-row sm:px-10 lg:flex-col lg:px-12 lg:py-10">
              <Link href="/register" className="group inline-flex min-h-12 items-center justify-center gap-3 border border-[#202a38] bg-[#202a38] px-6 text-sm font-semibold text-[#f7f4ee] transition-colors hover:bg-[#151b24] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#202a38] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f4ee] active:bg-[#0e1319]">Create account<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center border border-[#202a38] bg-transparent px-6 text-sm font-semibold text-[#202a38] transition-colors hover:bg-[#fff1f0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#202a38] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f4ee] active:bg-[#f4dfdf]">Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
