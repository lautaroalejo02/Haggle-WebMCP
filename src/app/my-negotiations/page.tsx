"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bot, Check, Handshake, LoaderCircle, RefreshCw } from "lucide-react";
import { DealSlip } from "@/components/deal-slip";
import { StatusChip } from "@/components/status-chip";
import { demoListings } from "@/lib/marketplace/demo-data";

type Deal = {
  id: string;
  listing: { id: string; title: string; sellerName: string; sellerEmoji: string };
  status: "seller_turn" | "buyer_turn" | "agreed_pending_approval" | "closed_deal" | "rejected" | "expired";
  round: number;
  maxRounds: number;
  currentTerms: {
    itemPriceCents: number;
    deliveryFeeCents: number;
    fulfillment: "pickup" | "delivery";
    placeName: string;
    timeLabel: string;
    accessoryName: string | null;
  };
  buyerApproved: boolean;
  sellerApproved: boolean;
};

type ApiDeal = {
  id: string;
  listingId: string;
  listing: { title: string };
  seller: { name: string; avatarEmoji: string };
  status: Deal["status"];
  round: number;
  maxRounds: number;
  currentProposal: {
    terms: {
      itemPriceCents: number;
      deliveryFeeCents: number;
      fulfillment: "pickup" | "delivery";
      meetingPlaceId: string | null;
      deliveryZoneId: string | null;
      timeWindowId: string;
      includedAccessoryId: string | null;
    };
  } | null;
  buyerApproved: boolean;
  sellerApproved: boolean;
};

export default function MyNegotiationsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/negotiations", { cache: "no-store" });
      if (!response.ok) return;
      const result = (await response.json()) as { negotiations?: ApiDeal[] };
      setDeals((result.negotiations ?? []).map(toDealView).filter((deal): deal is Deal => deal !== null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 2_000);
    window.addEventListener("haggle:data-changed", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("haggle:data-changed", refresh);
    };
  }, [refresh]);

  return (
    <main className="mx-auto min-h-[calc(100vh-7rem)] max-w-[82.5rem] px-5 pb-28 pt-10 sm:px-8">
      <div className="flex flex-col justify-between gap-5 border-b border-ink/20 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Buyer workspace</p>
          <h1 className="mt-2 font-display text-5xl tracking-[-0.045em]">My deals</h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-ink-muted">Every offer, counter, and human decision attached to this browser session.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void refresh()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid min-h-80 place-items-center text-ink-muted"><LoaderCircle className="animate-spin" /></div>
      ) : deals.length ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {deals.map((deal) => <DealCard key={deal.id} deal={deal} onRefresh={refresh} />)}
        </div>
      ) : (
        <div className="mt-12 grid min-h-80 place-items-center border-y border-ink/15 text-center">
          <div className="max-w-md px-5">
            <span className="mx-auto grid size-14 place-items-center bg-mint text-moss"><Handshake size={25} /></span>
            <h2 className="mt-5 font-display text-3xl tracking-[-0.035em]">No negotiations yet</h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Browse a bicycle and make an offer yourself, or ask your browser agent to search and negotiate within your budget.</p>
            <Link href="/" className="primary-button mt-6">Browse bicycles <ArrowRight size={17} /></Link>
          </div>
        </div>
      )}
    </main>
  );
}

function toDealView(deal: ApiDeal): Deal | null {
  if (!deal.currentProposal) return null;
  const listing = demoListings.find((item) => item.id === deal.listingId);
  const terms = deal.currentProposal.terms;
  const placeName =
    terms.fulfillment === "pickup"
      ? listing?.meetingPlaces.find((place) => place.id === terms.meetingPlaceId)?.name ?? "Public meeting place"
      : listing?.deliveryZones.find((zone) => zone.id === terms.deliveryZoneId)?.name ?? "Delivery zone";

  return {
    id: deal.id,
    listing: {
      id: deal.listingId,
      title: deal.listing.title,
      sellerName: deal.seller.name,
      sellerEmoji: deal.seller.avatarEmoji,
    },
    status: deal.status,
    round: deal.round,
    maxRounds: deal.maxRounds,
    currentTerms: {
      itemPriceCents: terms.itemPriceCents,
      deliveryFeeCents: terms.deliveryFeeCents,
      fulfillment: terms.fulfillment,
      placeName,
      timeLabel: listing?.timeWindows.find((window) => window.id === terms.timeWindowId)?.label ?? terms.timeWindowId,
      accessoryName:
        listing?.accessories.find((accessory) => accessory.id === terms.includedAccessoryId)?.name ?? null,
    },
    buyerApproved: deal.buyerApproved,
    sellerApproved: deal.sellerApproved,
  };
}

function DealCard({ deal, onRefresh }: { deal: Deal; onRefresh: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);

  async function approve() {
    setSubmitting(true);
    await fetch(`/api/negotiations/${deal.id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ actor: "buyer" }),
    });
    await onRefresh();
    window.dispatchEvent(new CustomEvent("haggle:data-changed"));
    setSubmitting(false);
  }

  return (
    <article className="border border-ink/20 bg-paper-raised p-5">
      <div className="flex items-start justify-between gap-5 border-b border-ink/15 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-muted">{deal.listing.sellerEmoji} {deal.listing.sellerName}</p>
          <h2 className="mt-1 font-display text-2xl tracking-[-0.03em]">{deal.listing.title}</h2>
        </div>
        <StatusChip status={deal.status} />
      </div>
      <div className="mt-5">
        <DealSlip
          {...deal.currentTerms}
          place={deal.currentTerms.placeName}
          time={deal.currentTerms.timeLabel}
          accessory={deal.currentTerms.accessoryName}
          stamp={deal.status === "closed_deal" ? "Both approved" : "Latest"}
        />
      </div>
      {deal.status === "agreed_pending_approval" ? (
        <div className="approval-takeover mt-5">
          <p className="text-sm font-extrabold">Your approval is required.</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">The seller must approve these exact terms separately.</p>
          <button className="primary-button mt-4 w-full" type="button" disabled={deal.buyerApproved || submitting} onClick={() => void approve()}>
            {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}
            {deal.buyerApproved ? "Buyer approved" : "Approve these terms"}
          </button>
        </div>
      ) : null}
      {deal.status === "seller_turn" ? (
        <p className="mt-5 flex items-center gap-2 bg-mustard-soft px-3 py-3 text-sm font-semibold"><Bot size={17} /> Seller agent is considering round {deal.round}.</p>
      ) : null}
      <Link href={`/listings/${deal.listing.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold hover:text-signal">Open negotiation <ArrowRight size={15} /></Link>
    </article>
  );
}
