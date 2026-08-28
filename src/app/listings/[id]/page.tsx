import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bike, MapPin, ShieldCheck, Truck } from "lucide-react";
import { NegotiationDesk } from "@/components/negotiation-desk";
import { formatUsd } from "@/lib/format";
import { getDemoListing } from "@/lib/marketplace/demo-data";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = getDemoListing(id);
  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-[82.5rem] px-5 pb-28 pt-7 sm:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-signal">
        <ArrowLeft size={16} /> Back to bicycles
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
            <Image src={listing.photoUrl} alt="" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 58vw" />
            <span className="absolute left-4 top-4 bg-paper-raised px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] shadow-sm">
              {listing.condition}
            </span>
          </div>
          <div className="grid gap-7 border-b border-ink/20 py-7 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">{listing.neighborhood} · Local pickup</p>
              <h1 className="mt-2 font-display text-5xl leading-[1.02] tracking-[-0.045em]">{listing.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-muted">{listing.description}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-muted">Asking</p>
              <p className="mt-1 font-display text-4xl tracking-[-0.04em]">{formatUsd(listing.askingPriceCents)}</p>
              <p className="mt-1 text-xs font-bold text-signal">Open to offers</p>
            </div>
          </div>
          <div className="grid gap-5 py-7 sm:grid-cols-3">
            <Detail icon={<Bike size={18} />} label="Condition" value={listing.condition} />
            <Detail icon={<MapPin size={18} />} label="Pickup" value={`${listing.meetingPlaces.length} public places`} />
            <Detail icon={<Truck size={18} />} label="Delivery" value={listing.allowsDelivery ? `From ${formatUsd(listing.deliveryFeeCents)}` : "Pickup only"} />
          </div>
          <div className="border-y border-ink/15 py-6">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center bg-mint text-xl">{listing.seller.avatarEmoji}</span>
              <div>
                <p className="text-sm font-extrabold">Sold by {listing.seller.name}</p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{listing.seller.styleDescription}</p>
                <p className="mt-2 flex items-center gap-2 text-xs font-bold text-moss"><ShieldCheck size={15} /> Private limits stay private</p>
              </div>
            </div>
          </div>
        </div>
        <aside className="lg:col-span-5">
          <NegotiationDesk listing={listing} />
        </aside>
      </div>
    </main>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-signal">{icon}</span>
      <div>
        <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
        <p className="mt-1 text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
