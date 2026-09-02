"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Check, CircleAlert, LockKeyhole, Plus, ShieldCheck } from "lucide-react";
import { ApprovalDiff, type ApprovalDiffRow } from "@/components/approval-diff";
import { DealSlip } from "@/components/deal-slip";
import type { DemoListing } from "@/lib/marketplace/demo-data";
import { formatUsd } from "@/lib/format";

const personas = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Haggler Hank",
    emoji: "🤝",
    brief: "Always counters the first valid offer, then seeks a fair midpoint. Prefers public Saturday pickup and can trade an accessory for stronger terms.",
  },
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Firm Fiona",
    emoji: "🧭",
    brief: "Direct and courteous. Concedes in small steps, values polite buyers, and never rushes below the private boundary.",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Easygoing Eli",
    emoji: "⚡",
    brief: "Optimizes for a quick, practical sale and may sweeten a pickup-today deal without crossing the private boundary.",
  },
] as const;

type PendingApproval = {
  id: string;
  buyerApprovedAt: string | null;
  listing: { id: string; title: string; photoUrl: string };
  originalIncludedAccessoryId: string | null;
  privateReview: { priceWithinPrivateMinimum: boolean };
  agreement: {
    itemPriceCents: number;
    deliveryFeeCents: number;
    fulfillment: "pickup" | "delivery";
    meetingPlaceId: string | null;
    deliveryZoneId: string | null;
    timeWindowId: string;
    includedAccessoryId: string | null;
  };
};

export function SellerStudio({ listings }: { listings: DemoListing[] }) {
  const [personaId, setPersonaId] = useState<string>(personas[0].id);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const persona = personas.find((item) => item.id === personaId) ?? personas[0];
  const personaListings = useMemo(() => listings.filter((listing) => listing.seller.id === personaId), [listings, personaId]);

  const refreshApprovals = useCallback(async () => {
    const response = await fetch(
      `/api/sellers/negotiations?sellerPersonaId=${encodeURIComponent(personaId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const result = (await response.json()) as { negotiations?: PendingApproval[] };
    setPendingApprovals(result.negotiations ?? []);
  }, [personaId]);

  useEffect(() => {
    void refreshApprovals();
    const timer = setInterval(refreshApprovals, 2_000);
    window.addEventListener("haggle:data-changed", refreshApprovals);
    return () => {
      clearInterval(timer);
      window.removeEventListener("haggle:data-changed", refreshApprovals);
    };
  }, [refreshApprovals]);

  async function approveDeal(negotiationId: string) {
    setApprovingId(negotiationId);
    const response = await fetch(`/api/sellers/negotiations/${negotiationId}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sellerPersonaId: personaId }),
    });
    const result = (await response.json()) as { summary?: string; error?: { message?: string } };
    setNotice(result.summary ?? result.error?.message ?? "Seller decision recorded.");
    await refreshApprovals();
    window.dispatchEvent(new CustomEvent("haggle:data-changed"));
    setApprovingId(null);
  }

  async function createListing(form: HTMLFormElement) {
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/sellers/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, sellerPersonaId: personaId }),
      });
      const result = (await response.json()) as { summary?: string; error?: { message?: string } };
      setNotice(result.summary ?? result.error?.message ?? "Listing submitted.");
      if (response.ok) form.reset();
    } catch {
      setNotice("The listing service is unavailable until the database is connected.");
    }
  }

  return (
    <main className="mx-auto max-w-[82.5rem] px-5 pb-28 pt-10 sm:px-8">
      <div className="border-b border-ink/20 pb-6">
        <p className="eyebrow">Seller workspace</p>
        <h1 className="mt-2 font-display text-5xl tracking-[-0.045em]">Seller studio</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-muted">Give a resident agent private boundaries, review the terms it finds, and keep the final decision human.</p>
        <p className="mt-4 inline-flex items-center gap-2 bg-sky-soft px-3 py-2 text-xs font-extrabold text-deep-blue">
          <Bot size={15} /> Challenge demo · persona switching simulates sellers and is not account authentication
        </p>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-ink/15 pb-5">
        {personas.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setPersonaId(item.id)}
            className={`flex min-w-fit items-center gap-3 border px-4 py-3 text-left ${personaId === item.id ? "border-ink bg-ink text-paper-raised" : "border-ink/15 bg-paper-raised"}`}
          >
            <span className="text-xl">{item.emoji}</span>
            <span className="text-sm font-extrabold">{item.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section>
            <div className="flex items-end justify-between gap-5 border-b border-ink/20 pb-4">
              <div>
                <p className="eyebrow">Approval queue</p>
                <h2 className="mt-1 font-display text-3xl tracking-[-0.035em]">Terms waiting for you</h2>
              </div>
              <span className="bg-moss-soft px-2.5 py-1 text-xs font-extrabold text-moss">{pendingApprovals.length} pending</span>
            </div>
            {pendingApprovals.length ? (
              <div className="mt-5 space-y-5">
                {pendingApprovals.map((approval) => {
                  const listing = listings.find((item) => item.id === approval.listing.id);
                  const place =
                    approval.agreement.fulfillment === "pickup"
                      ? listing?.meetingPlaces.find((item) => item.id === approval.agreement.meetingPlaceId)?.name ?? "Public meeting place"
                      : listing?.deliveryZones.find((item) => item.id === approval.agreement.deliveryZoneId)?.name ?? "Delivery zone";
                  const time = listing?.timeWindows.find((item) => item.id === approval.agreement.timeWindowId)?.label ?? approval.agreement.timeWindowId;
                  const accessory = listing?.accessories.find((item) => item.id === approval.agreement.includedAccessoryId)?.name ?? null;
                  const originalAccessory = listing?.accessories.find((item) => item.id === approval.originalIncludedAccessoryId)?.name ?? null;
                  const reviewRows = sellerApprovalRows({
                    approval,
                    listing,
                    place,
                    time,
                    accessory,
                    originalAccessory,
                  });
                  return (
                    <article key={approval.id} className="border-l-4 border-moss bg-paper-raised px-5 py-5">
                      <p className="eyebrow">Terms found · {approval.listing.title}</p>
                      <div className="mt-4">
                        <DealSlip
                          itemPriceCents={approval.agreement.itemPriceCents}
                          deliveryFeeCents={approval.agreement.deliveryFeeCents}
                          fulfillment={approval.agreement.fulfillment}
                          place={place}
                          time={time}
                          accessory={accessory}
                          stamp="You decide"
                        />
                      </div>
                      <p className="mt-4 text-xs font-bold text-moss">
                        {approval.buyerApprovedAt ? "Buyer approved ✓" : "Buyer decision pending"}
                      </p>
                      <ApprovalDiff title="Terms against your private limits" rows={reviewRows} />
                      <p className="mt-3 flex items-start gap-2 text-[0.68rem] leading-5 text-ink-muted">
                        <LockKeyhole size={14} className="mt-0.5 shrink-0" /> Private values are checked on the server and stay out of this response.
                      </p>
                      <button
                        type="button"
                        className="primary-button mt-4 w-full"
                        disabled={approvingId === approval.id}
                        onClick={() => void approveDeal(approval.id)}
                      >
                        <Check size={17} /> {approvingId === approval.id ? "Approving…" : "Approve sale"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 border-l-4 border-moss bg-paper-raised px-5 py-5">
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 text-moss" size={19} />
                  <div>
                    <p className="text-sm font-extrabold">No seller approvals waiting</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">When an agent finds acceptable terms, the complete price, place, time, and extras will appear here.</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <div className="border-b border-ink/20 pb-4">
              <p className="eyebrow">Listing ledger</p>
              <h2 className="mt-1 font-display text-3xl tracking-[-0.035em]">{persona.name}&apos;s bicycles</h2>
            </div>
            <div className="divide-y divide-ink/15">
              {personaListings.map((listing) => (
                <article key={listing.id} className="grid grid-cols-[1fr_auto] items-center gap-5 py-5">
                  <div>
                    <h3 className="font-display text-2xl tracking-[-0.03em]">{listing.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{listing.condition} · {listing.neighborhood} · {listing.allowsDelivery ? "Pickup or delivery" : "Pickup"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold">{formatUsd(listing.askingPriceCents)}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-moss">Active</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="border-t border-ink/20 pt-7">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="eyebrow">Declarative WebMCP</p>
                <h2 className="mt-1 font-display text-3xl tracking-[-0.035em]">List a bicycle</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">This real form is agent-fillable, but submission remains visible and human-reviewed.</p>
              </div>
              <span className="hidden items-center gap-2 bg-sky-soft px-3 py-2 text-xs font-extrabold text-deep-blue sm:flex"><Bot size={15} /> Agent-fillable</span>
            </div>
            <form
              className="mt-6 grid gap-4 border border-ink/20 bg-paper-raised p-5 sm:grid-cols-2"
              toolname="create_listing"
              tooldescription="Fill a draft bicycle listing for the selected seller persona. The human seller reviews private pricing and submits the visible form manually; this tool never publishes automatically."
              onSubmit={(event) => {
                event.preventDefault();
                void createListing(event.currentTarget);
              }}
            >
              <label className="field-label sm:col-span-2">Title<input name="title" required maxLength={100} toolparamdescription="Concise bicycle title including brand or model." /></label>
              <label className="field-label sm:col-span-2">Description<textarea name="description" required maxLength={800} rows={4} toolparamdescription="Honest public condition and usage description." /></label>
              <label className="field-label">Condition<select name="condition" required toolparamdescription="Public bicycle condition."><option>Excellent</option><option>Very good</option><option>Good</option><option>Fair</option></select></label>
              <label className="field-label">Neighborhood<input name="neighborhood" required maxLength={80} toolparamdescription="Public neighborhood only; never a home address." /></label>
              <label className="field-label">Asking price (USD)<input name="askingPriceUsd" type="number" required min="1" step="0.01" toolparamdescription="Public starting price in USD." /></label>
              <label className="field-label">Private minimum (USD)<input name="floorPriceUsd" type="number" required min="1" step="0.01" toolparamdescription="Private seller boundary; never exposed to buyers or tools." /></label>
              <p className="sm:col-span-2 text-xs leading-5 text-ink-muted">A privacy-safe demo placeholder is assigned automatically. Production accounts would upload and moderate their own images.</p>
              {notice ? <p className="sm:col-span-2 flex items-start gap-2 bg-mustard-soft px-3 py-2 text-sm"><CircleAlert size={17} className="mt-0.5" /> {notice}</p> : null}
              <button type="submit" className="primary-button sm:col-span-2"><Plus size={18} /> Create listing</button>
            </form>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="sticky top-24 border border-ink/20 bg-paper-raised p-5">
            <div className="flex items-center justify-between border-b border-ink/15 pb-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]"><LockKeyhole size={15} /> Private agent brief</p>
              <span className="text-xl">{persona.emoji}</span>
            </div>
            <p className="mt-5 font-display text-2xl leading-snug tracking-[-0.025em]">{persona.brief}</p>
            <div className="mt-5 border-t border-ink/15 pt-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-moss"><ShieldCheck size={16} className="mt-0.5 shrink-0" /> The numeric floor and policy prompt never enter public APIs, WebMCP results, or the audit ticker.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function sellerApprovalRows({
  approval,
  listing,
  place,
  time,
  accessory,
  originalAccessory,
}: {
  approval: PendingApproval;
  listing: DemoListing | undefined;
  place: string;
  time: string;
  accessory: string | null;
  originalAccessory: string | null;
}): ApprovalDiffRow[] {
  const methodAllowed =
    approval.agreement.fulfillment === "pickup"
      ? Boolean(listing?.allowsPickup)
      : Boolean(listing?.allowsDelivery);
  const timeAllowed = Boolean(listing?.timeWindows.some((window) => window.id === approval.agreement.timeWindowId));
  const placeAllowed =
    approval.agreement.fulfillment === "pickup"
      ? Boolean(listing?.meetingPlaces.some((item) => item.id === approval.agreement.meetingPlaceId))
      : Boolean(listing?.deliveryZones.some((item) => item.id === approval.agreement.deliveryZoneId));
  return [
    {
      label: "Price",
      value: `${formatUsd(approval.agreement.itemPriceCents + approval.agreement.deliveryFeeCents)} complete · ${approval.privateReview.priceWithinPrivateMinimum ? "inside your private boundary" : "below your private boundary"}`,
      state: approval.privateReview.priceWithinPrivateMinimum ? "good" : "warning",
    },
    {
      label: "Method",
      value: `${approval.agreement.fulfillment} · ${methodAllowed ? "allowed" : "outside listing terms"}`,
      state: methodAllowed ? "good" : "warning",
    },
    {
      label: "Time",
      value: `${time} · ${timeAllowed ? "in your availability" : "outside your availability"}`,
      state: timeAllowed ? "good" : "warning",
    },
    {
      label: "Place",
      value: `${place} · ${placeAllowed ? "listing-approved" : "unverified"}`,
      state: placeAllowed ? "good" : "warning",
    },
    {
      label: "Included",
      value:
        accessory && accessory !== originalAccessory
          ? `${accessory} · added by your agent`
          : accessory
            ? `${accessory} · kept from the buyer's offer`
            : originalAccessory
              ? `${originalAccessory} · removed during negotiation`
              : "No extras included",
      state: "neutral",
    },
  ];
}
