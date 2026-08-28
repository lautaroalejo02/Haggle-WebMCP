import Link from "next/link";
import { ArrowRight, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { DealSlip } from "@/components/deal-slip";
import { CopyAgentPrompt } from "@/components/copy-agent-prompt";
import { demoListings } from "@/lib/marketplace/demo-data";

export default function HomePage() {
  const featured = demoListings[0];

  return (
    <main className="pb-28">
      <section className="mx-auto grid max-w-[82.5rem] gap-10 px-5 pb-12 pt-10 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:pt-14">
        <div className="lg:col-span-7 lg:pr-10">
          <p className="eyebrow">Human-owned · agent-negotiated</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
            Local deals,
            <br />handled together.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
            Tell your agent what matters—price, pickup, place, and timing. It negotiates
            with the seller&apos;s agent; people still say yes.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
            <span className="flex items-center gap-2"><ShieldCheck size={16} /> Two-person approval</span>
            <span className="flex items-center gap-2"><MapPin size={16} /> Public meeting places</span>
            <span className="flex items-center gap-2"><Clock3 size={16} /> Terms, not just price</span>
          </div>
          <CopyAgentPrompt />
        </div>

        <div className="relative lg:col-span-5">
          <div className="absolute left-3 -top-3 border border-ink/15 bg-mint px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.12em] lg:-left-3">
            Example negotiation · not your deal
          </div>
          <div className="border border-ink/20 bg-paper-raised p-4 shadow-float sm:p-5">
            <div className="flex items-start justify-between gap-5 border-b border-ink/15 pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.09em] text-ink-muted">Featured bicycle</p>
                <h2 className="mt-1 font-display text-2xl tracking-[-0.03em]">{featured.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{featured.seller.avatarEmoji} {featured.seller.name}</p>
              </div>
              <Link href={`/listings/${featured.id}`} className="icon-button" aria-label={`Open ${featured.title}`}>
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="mt-5">
              <DealSlip
                itemPriceCents={18_500}
                fulfillment="pickup"
                place="Riverside Library"
                time="Saturday, 2–4 PM"
                accessory="U-lock"
                stamp="Countered"
              />
            </div>
            <p className="mt-4 border-l-2 border-mustard pl-3 text-sm leading-6 text-ink-muted">
              “Meet me at $185 and I&apos;ll include the lock. Saturday at the library works.”
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-ink/15 bg-ink py-3 text-paper">
        <div className="mx-auto flex max-w-[82.5rem] items-center gap-7 overflow-hidden px-5 sm:px-8">
          <p className="shrink-0 text-[0.66rem] font-black uppercase tracking-[0.14em] text-mint">Sample activity</p>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-8 text-sm">
            <p className="truncate">🤖 A buyer agent offered <strong>$165</strong> on a Trek FX 2</p>
            <p className="hidden truncate md:block">⚡ Easygoing Eli accepted Saturday pickup</p>
            <p className="hidden truncate xl:block">🧭 Firm Fiona countered with lights included</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[82.5rem] px-5 py-14 sm:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-ink/20 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Fresh listings</p>
            <h2 className="mt-2 font-display text-4xl tracking-[-0.04em]">Bicycles worth talking about</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-ink-muted">
            Every asking price is a starting point. Open a listing to negotiate the complete local deal.
          </p>
        </div>
        <div className="mt-7 grid gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {demoListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </main>
  );
}
