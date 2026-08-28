import Image from "next/image";
import Link from "next/link";
import { Bike, MapPin } from "lucide-react";
import type { DemoListing } from "@/lib/marketplace/demo-data";
import { formatUsd } from "@/lib/format";

export function ListingCard({ listing }: { listing: DemoListing }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="listing-card group block border-t border-ink/20 pt-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
        <Image
          src={listing.photoUrl}
          alt=""
          fill
          className="object-cover transition duration-500 ease-out group-hover:scale-[1.025]"
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
        />
        <span className="absolute left-3 top-3 bg-paper-raised px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-ink shadow-sm">
          {listing.condition}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-4 py-4">
        <div>
          <h3 className="font-display text-[1.45rem] leading-tight tracking-[-0.025em] group-hover:text-signal">
            {listing.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
            <MapPin size={14} aria-hidden="true" />
            {listing.neighborhood} · {listing.seller.avatarEmoji} {listing.seller.name}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
            <Bike size={14} aria-hidden="true" />
            {listing.allowsDelivery ? "Pickup or delivery" : "Pickup"}
          </p>
        </div>
        <p className="text-lg font-extrabold tabular-nums">{formatUsd(listing.askingPriceCents)}</p>
      </div>
    </Link>
  );
}
