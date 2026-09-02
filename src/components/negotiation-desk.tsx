"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Check, CircleAlert, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { DealSlip } from "@/components/deal-slip";
import { StatusChip } from "@/components/status-chip";
import type { DemoListing } from "@/lib/marketplace/demo-data";
import { formatUsd } from "@/lib/format";

type DealTermsView = {
  itemPriceCents: number;
  deliveryFeeCents: number;
  fulfillment: "pickup" | "delivery";
  placeName: string;
  timeLabel: string;
  accessoryName: string | null;
};

type NegotiationView = {
  id: string;
  status: "seller_turn" | "buyer_turn" | "agreed_pending_approval" | "closed_deal" | "rejected" | "expired";
  round: number;
  maxRounds: number;
  currentTerms: DealTermsView;
  agreementTerms: DealTermsView | null;
  possibleActions: string[];
  buyerApproved: boolean;
  sellerApproved: boolean;
  events: Array<{
    id: string;
    actorLabel: string;
    message: string;
    amountCents: number | null;
    type: string;
  }>;
};

type ApiProposal = {
  id: string;
  side: "buyer" | "seller";
  terms: {
    itemPriceCents: number;
    deliveryFeeCents: number;
    fulfillment: "pickup" | "delivery";
    meetingPlaceId: string | null;
    deliveryZoneId: string | null;
    timeWindowId: string;
    includedAccessoryId: string | null;
  };
  message: string;
};

type ApiNegotiation = Omit<NegotiationView, "currentTerms" | "agreementTerms" | "events"> & {
  listingId: string;
  currentProposal: ApiProposal;
  agreementProposal: ApiProposal | null;
  history: ApiProposal[];
  timeline: Array<{
    id?: string;
    actor: string;
    type: string;
    message: string | null;
    amountCents: number | null;
  }>;
};

type FormState = {
  amountUsd: string;
  fulfillment: "pickup" | "delivery";
  meetingPlaceId: string;
  deliveryZoneId: string;
  timeWindowId: string;
  includedAccessoryId: string;
  message: string;
};

export function NegotiationDesk({ listing }: { listing: DemoListing }) {
  const [negotiation, setNegotiation] = useState<NegotiationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => ({
    amountUsd: String(Math.round((listing.askingPriceCents * 0.8) / 100)),
    fulfillment: "pickup",
    meetingPlaceId: listing.meetingPlaces[0]?.id ?? "",
    deliveryZoneId: listing.deliveryZones[0]?.id ?? "",
    timeWindowId: listing.timeWindows[0]?.id ?? "",
    includedAccessoryId: listing.accessories[0]?.id ?? "",
    message: "I can make the handoff easy and be there on time.",
  }));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/negotiations?listingId=${encodeURIComponent(listing.id)}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const result = (await response.json()) as { negotiations?: ApiNegotiation[] };
      const match = result.negotiations?.find((item) => item.listingId === listing.id) ?? null;
      setNegotiation(match ? toNegotiationView(match, listing) : null);
    } finally {
      setLoading(false);
    }
  }, [listing]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(refresh, 2_000);
    window.addEventListener("haggle:data-changed", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("haggle:data-changed", refresh);
    };
  }, [refresh]);

  const selectedPlace = useMemo(() => {
    if (form.fulfillment === "pickup") {
      return listing.meetingPlaces.find((option) => option.id === form.meetingPlaceId)?.name ?? "Public meeting place";
    }
    return listing.deliveryZones.find((option) => option.id === form.deliveryZoneId)?.name ?? "Delivery zone";
  }, [form, listing]);
  const selectedTime = listing.timeWindows.find((option) => option.id === form.timeWindowId)?.label ?? "Time to agree";
  const selectedAccessory = listing.accessories.find((option) => option.id === form.includedAccessoryId)?.name ?? null;

  async function postAction(url: string, body: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { summary?: string; error?: { message?: string } };
      if (!response.ok) {
        setError(result.error?.message ?? result.summary ?? "The deal could not be updated.");
        return;
      }
      await refresh();
      window.dispatchEvent(new CustomEvent("haggle:data-changed"));
    } catch {
      setError("Haggle could not reach the marketplace service.");
    } finally {
      setSubmitting(false);
    }
  }

  const proposalBody = {
    amountUsd: Number(form.amountUsd),
    fulfillment: form.fulfillment,
    meetingPlaceId: form.fulfillment === "pickup" ? form.meetingPlaceId : undefined,
    deliveryZoneId: form.fulfillment === "delivery" ? form.deliveryZoneId : undefined,
    timeWindowId: form.timeWindowId,
    includedAccessoryId: form.includedAccessoryId || undefined,
    message: form.message || undefined,
  };

  return (
    <div className="negotiation-desk lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-5 border-b border-ink/15 pb-4">
        <div>
          <p className="eyebrow">Negotiation desk</p>
          <h2 className="mt-1 font-display text-3xl tracking-[-0.035em]">
            {negotiation ? "Work out the terms" : "Make the first move"}
          </h2>
        </div>
        {negotiation ? (
          <StatusChip status={negotiation.status} />
        ) : (
          <span className="bg-mint px-2.5 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.1em] text-moss">Open</span>
        )}
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center text-ink-muted">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : negotiation ? (
        <ExistingNegotiation
          negotiation={negotiation}
          submitting={submitting}
          onAccept={() => postAction(`/api/negotiations/${negotiation.id}/accept`, { negotiationId: negotiation.id })}
          onApprove={() => postAction(`/api/negotiations/${negotiation.id}/approve`, { actor: "buyer" })}
          onDecline={(reason) =>
            postAction(`/api/negotiations/${negotiation.id}/decline`, {
              negotiationId: negotiation.id,
              reason: reason || undefined,
            })
          }
          onReject={() => postAction(`/api/negotiations/${negotiation.id}/reject`, { negotiationId: negotiation.id })}
        />
      ) : (
        <div className="pt-5">
          <div className="mb-5 flex items-start gap-3 bg-mint/60 px-3 py-3 text-sm leading-6">
            <Bot className="mt-0.5 shrink-0 text-moss" size={18} />
            <p>
              Your browser agent can fill these same structured terms with <code className="font-bold">make_offer</code>.
            </p>
          </div>
          <DealSlip
            itemPriceCents={Math.max(0, Math.round(Number(form.amountUsd || 0) * 100))}
            deliveryFeeCents={form.fulfillment === "delivery" ? listing.deliveryFeeCents : 0}
            fulfillment={form.fulfillment}
            place={selectedPlace}
            time={selectedTime}
            accessory={selectedAccessory}
            stamp="Your offer"
          />
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void postAction("/api/negotiations", { listingId: listing.id, ...proposalBody });
            }}
          >
            <label className="field-label">
              Your item price
              <span className="price-input mt-1.5">
                <span>$</span>
                <input
                  name="amountUsd"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={form.amountUsd}
                  onChange={(event) => setForm({ ...form, amountUsd: event.target.value })}
                />
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">
                Handoff
                <select
                  name="fulfillment"
                  value={form.fulfillment}
                  onChange={(event) => setForm({ ...form, fulfillment: event.target.value as "pickup" | "delivery" })}
                >
                  <option value="pickup">Pickup</option>
                  {listing.allowsDelivery ? <option value="delivery">Delivery (+{formatUsd(listing.deliveryFeeCents)})</option> : null}
                </select>
              </label>
              <label className="field-label">
                {form.fulfillment === "pickup" ? "Public place" : "Delivery zone"}
                {form.fulfillment === "pickup" ? (
                  <select name="meetingPlaceId" value={form.meetingPlaceId} onChange={(event) => setForm({ ...form, meetingPlaceId: event.target.value })}>
                    {listing.meetingPlaces.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                ) : (
                  <select name="deliveryZoneId" value={form.deliveryZoneId} onChange={(event) => setForm({ ...form, deliveryZoneId: event.target.value })}>
                    {listing.deliveryZones.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                )}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">
                Time
                <select name="timeWindowId" value={form.timeWindowId} onChange={(event) => setForm({ ...form, timeWindowId: event.target.value })}>
                  {listing.timeWindows.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label className="field-label">
                Ask to include
                <select name="includedAccessoryId" value={form.includedAccessoryId} onChange={(event) => setForm({ ...form, includedAccessoryId: event.target.value })}>
                  <option value="">Nothing extra</option>
                  {listing.accessories.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
            </div>
            <label className="field-label">
              Note to the seller
              <textarea name="message" maxLength={280} rows={2} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
            </label>
            {error ? <ErrorMessage message={error} /> : null}
            <button type="submit" className="primary-button w-full" disabled={submitting}>
              {submitting ? <LoaderCircle size={18} className="animate-spin" /> : <Bot size={18} />}
              Send terms to seller agent
            </button>
            <p className="flex items-center justify-center gap-2 text-xs text-ink-muted">
              <LockKeyhole size={14} /> No commitment—both people approve later.
            </p>
          </form>
        </div>
      )}
      {error && negotiation ? <div className="mt-4"><ErrorMessage message={error} /></div> : null}
    </div>
  );
}

function toNegotiationView(negotiation: ApiNegotiation, listing: DemoListing): NegotiationView {
  const toTerms = (proposal: ApiProposal): DealTermsView => {
    const terms = proposal.terms;
    const placeName =
      terms.fulfillment === "pickup"
        ? listing.meetingPlaces.find((place) => place.id === terms.meetingPlaceId)?.name ?? "Public meeting place"
        : listing.deliveryZones.find((zone) => zone.id === terms.deliveryZoneId)?.name ?? "Delivery zone";

    return {
      itemPriceCents: terms.itemPriceCents,
      deliveryFeeCents: terms.deliveryFeeCents,
      fulfillment: terms.fulfillment,
      placeName,
      timeLabel: listing.timeWindows.find((window) => window.id === terms.timeWindowId)?.label ?? terms.timeWindowId,
      accessoryName:
        listing.accessories.find((accessory) => accessory.id === terms.includedAccessoryId)?.name ?? null,
    };
  };

  return {
    id: negotiation.id,
    status: negotiation.status,
    round: negotiation.round,
    maxRounds: negotiation.maxRounds,
    currentTerms: toTerms(negotiation.currentProposal),
    agreementTerms: negotiation.agreementProposal ? toTerms(negotiation.agreementProposal) : null,
    possibleActions: negotiation.possibleActions,
    buyerApproved: negotiation.buyerApproved,
    sellerApproved: negotiation.sellerApproved,
    events: negotiation.timeline?.length
      ? negotiation.timeline.map((event, index) => ({
          id: event.id ?? `${event.type}-${index}`,
          actorLabel:
            event.actor === "buyer_agent"
              ? "Buyer agent"
              : event.actor === "seller_agent"
                ? listing.seller.name
                : event.actor === "buyer_human"
                  ? "You"
                  : event.actor === "seller_human"
                    ? "Seller"
                    : "Haggle",
          message: event.message ?? "Negotiation updated.",
          amountCents: event.amountCents,
          type: event.type,
        }))
      : negotiation.history.map((proposal) => ({
          id: proposal.id,
          actorLabel: proposal.side === "buyer" ? "Buyer agent" : listing.seller.name,
          message: proposal.message,
          amountCents: proposal.terms.itemPriceCents + proposal.terms.deliveryFeeCents,
          type: proposal.side === "buyer" ? "offer" : "counter",
        })),
  };
}

function ExistingNegotiation({
  negotiation,
  submitting,
  onAccept,
  onApprove,
  onDecline,
  onReject,
}: {
  negotiation: NegotiationView;
  submitting: boolean;
  onAccept: () => void;
  onApprove: () => void;
  onDecline: (reason: string) => void;
  onReject: () => void;
}) {
  const [declineReason, setDeclineReason] = useState("");
  const terms = negotiation.agreementTerms ?? negotiation.currentTerms;
  return (
    <div className="pt-5">
      <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
        <span>Round {negotiation.round} of {negotiation.maxRounds}</span>
        <span>Complete terms</span>
      </div>
      <DealSlip
        itemPriceCents={terms.itemPriceCents}
        deliveryFeeCents={terms.deliveryFeeCents}
        fulfillment={terms.fulfillment}
        place={terms.placeName}
        time={terms.timeLabel}
        accessory={terms.accessoryName}
        stamp={negotiation.status === "closed_deal" ? "Both approved" : negotiation.status === "agreed_pending_approval" ? "Terms found" : "Latest"}
      />
      <div className="mt-5 max-h-52 space-y-3 overflow-y-auto border-y border-ink/15 py-4">
        {negotiation.events.map((event) => (
          <div
            key={event.id}
            className={`border-l-2 pl-3 ${event.type === "human_declined" ? "border-danger bg-tomato-soft px-3 py-2" : "border-sky"}`}
          >
            <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.09em] text-ink-muted">{event.actorLabel}</p>
            <p className="mt-1 text-sm leading-6">{event.message}</p>
          </div>
        ))}
      </div>

      {negotiation.status === "seller_turn" ? (
        <div className="mt-5 flex items-center gap-3 bg-mustard-soft px-4 py-4">
          <span className="flex gap-1" aria-hidden="true"><i className="waiting-dot" /><i className="waiting-dot" /><i className="waiting-dot" /></span>
          <p className="text-sm font-semibold">The seller agent is considering your terms…</p>
        </div>
      ) : null}

      {negotiation.status === "buyer_turn" ? (
        negotiation.possibleActions.includes("accept_deal") ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="primary-button" onClick={onAccept} disabled={submitting}>Accept terms</button>
            <button type="button" className="secondary-button" onClick={onReject} disabled={submitting}>End negotiation</button>
          </div>
        ) : (
          <div className="mt-5 border-l-4 border-mustard bg-mustard-soft px-4 py-4">
            <p className="text-sm font-extrabold">Your agent has the next move.</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">It can read your reason with <code className="font-bold">get_negotiation_status</code> and propose revised terms.</p>
            <button type="button" className="secondary-button mt-3" onClick={onReject} disabled={submitting}>End negotiation</button>
          </div>
        )
      ) : null}

      {negotiation.status === "agreed_pending_approval" ? (
        <div className="approval-takeover mt-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0 text-moss" />
            <div>
              <h3 className="font-display text-2xl tracking-[-0.03em]">Your agent found acceptable terms.</h3>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Review every field above. Your approval is required, and the seller must approve separately.</p>
            </div>
          </div>
          <div className="mt-4">
            <button type="button" className="primary-button" onClick={onApprove} disabled={submitting || negotiation.buyerApproved}>
              <Check size={18} /> {negotiation.buyerApproved ? "You approved" : "Approve these terms"}
            </button>
            <label className="field-label mt-4">
              If these terms do not work
              <input
                type="text"
                maxLength={140}
                placeholder="Optional note for your agent"
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <button type="button" className="secondary-button" onClick={() => onDecline(declineReason)} disabled={submitting}>
                Decline &amp; keep negotiating
              </button>
              <button type="button" className="px-3 text-xs font-extrabold text-danger underline underline-offset-2" onClick={onReject} disabled={submitting}>
                End negotiation
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {negotiation.status === "closed_deal" ? (
        <div className="mt-5 bg-moss px-5 py-5 text-paper-raised">
          <p className="text-xs font-black uppercase tracking-[0.13em] text-mint">Deal closed</p>
          <h3 className="mt-2 font-display text-3xl">Both people said yes.</h3>
          <p className="mt-2 text-sm text-paper/80">Haggle preserved the exact approved proposal in the audit trail.</p>
        </div>
      ) : null}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-2 bg-tomato-soft px-3 py-2.5 text-sm text-danger">
      <CircleAlert size={17} className="mt-0.5 shrink-0" /> {message}
    </p>
  );
}
