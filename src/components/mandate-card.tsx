"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Save, X } from "lucide-react";
import type { DemoListing } from "@/lib/marketplace/demo-data";
import { formatUsd } from "@/lib/format";
import {
  MANDATE_FEATURE_ENABLED,
  pickupWindowFromLabel,
  type PickupWindow,
} from "@/lib/negotiation/mandate";

type CurrentTerms = {
  itemPriceCents: number;
  deliveryFeeCents: number;
  fulfillment: "pickup" | "delivery";
  placeName: string;
  timeLabel: string;
  accessoryName: string | null;
};

export type BuyerMandateView = {
  maxPrice: number;
  maxPriceCents: number;
  pickupWindows: PickupWindow[];
  placePolicy: "public_only" | "any";
  mustInclude: string[];
};

type MandateResponse = {
  mandate?: BuyerMandateView;
  recentBlocks?: Array<{ id: string; message: string }>;
  summary?: string;
  error?: { message?: string };
};

export function MandateCard({ listing, terms }: { listing: DemoListing; terms: CurrentTerms }) {
  if (!MANDATE_FEATURE_ENABLED) return null;
  return <EnabledMandateCard listing={listing} terms={terms} />;
}

function EnabledMandateCard({ listing, terms }: { listing: DemoListing; terms: CurrentTerms }) {
  const [mandate, setMandate] = useState<BuyerMandateView | null>(null);
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedWindowIds, setSelectedWindowIds] = useState<string[]>([]);
  const [placePolicy, setPlacePolicy] = useState<"public_only" | "any">("public_only");
  const [mustInclude, setMustInclude] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<Array<{ id: string; message: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const availableWindows = useMemo(
    () =>
      listing.timeWindows.flatMap((window) => {
        const parsed = pickupWindowFromLabel(window.label);
        return parsed ? [{ ...window, parsed }] : [];
      }),
    [listing.timeWindows],
  );

  const applyResponse = useCallback(
    (result: MandateResponse) => {
      if (!result.mandate) return;
      setMandate(result.mandate);
      setMaxPrice(String(result.mandate.maxPrice));
      setPlacePolicy(result.mandate.placePolicy);
      setMustInclude(result.mandate.mustInclude);
      setSelectedWindowIds(
        availableWindows
          .filter((window) =>
            result.mandate!.pickupWindows.some(
              (allowed) =>
                allowed.day === window.parsed.day &&
                allowed.from === window.parsed.from &&
                allowed.to === window.parsed.to,
            ),
          )
          .map((window) => window.id),
      );
      setBlocks(result.recentBlocks ?? []);
    },
    [availableWindows],
  );

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/mandates/${encodeURIComponent(listing.id)}`, { cache: "no-store" });
    if (!response.ok) return;
    applyResponse((await response.json()) as MandateResponse);
  }, [applyResponse, listing.id]);

  useEffect(() => {
    void refresh();
    window.addEventListener("haggle:data-changed", refresh);
    return () => window.removeEventListener("haggle:data-changed", refresh);
  }, [refresh]);

  async function save() {
    setSaving(true);
    setNotice(null);
    const response = await fetch(`/api/mandates/${encodeURIComponent(listing.id)}`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({
        mandate: {
          maxPrice: Number(maxPrice),
          pickupWindows: availableWindows
            .filter((window) => selectedWindowIds.includes(window.id))
            .map((window) => window.parsed),
          placePolicy,
          mustInclude,
        },
      }),
    });
    const result = (await response.json()) as MandateResponse;
    if (response.ok) {
      applyResponse(result);
      setNotice(result.summary ?? "Your mandate is saved.");
      window.dispatchEvent(new CustomEvent("haggle:data-changed"));
    } else {
      setNotice(result.error?.message ?? "Your mandate could not be saved.");
    }
    setSaving(false);
  }

  if (!mandate) {
    return (
      <div className="mt-5 flex items-center gap-2 border border-ink/15 bg-paper-raised px-4 py-3 text-sm text-ink-muted">
        <LoaderCircle size={16} className="animate-spin" /> Preparing your mandate
      </div>
    );
  }

  const proposedWindow = pickupWindowFromLabel(terms.timeLabel);
  const selectedWindows = availableWindows
    .filter((window) => selectedWindowIds.includes(window.id))
    .map((window) => window.parsed);
  const totalCents = terms.itemPriceCents + terms.deliveryFeeCents;
  const priceOk = totalCents <= mandate.maxPriceCents;
  const windowOk =
    terms.fulfillment === "delivery" ||
    Boolean(
      proposedWindow &&
        mandate.pickupWindows.some(
          (window) =>
            window.day.toLowerCase() === proposedWindow.day.toLowerCase() &&
            proposedWindow.from >= window.from &&
            proposedWindow.to <= window.to,
        ),
    );
  const placeOk = mandate.placePolicy === "any" || terms.placeName !== "Unknown place";
  const included = new Set(terms.accessoryName ? [terms.accessoryName.toLowerCase()] : []);
  const includeOk = mandate.mustInclude.every((item) => included.has(item.toLowerCase()));

  return (
    <section className="mt-5 border border-ink/20 bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-4 border-b border-ink/15 pb-3">
        <div>
          <p className="eyebrow">Private buyer mandate</p>
          <h3 className="mt-1 font-display text-2xl tracking-[-0.03em]">Your agent negotiates. Your mandate decides.</h3>
        </div>
        <span className="bg-moss-soft px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-moss">Enforced</span>
      </div>

      <div className="mt-4 grid gap-2 text-xs">
        <MandateCheck ok={priceOk} text={`${formatUsd(totalCents)} vs ${formatUsd(mandate.maxPriceCents)} max`} />
        <MandateCheck ok={windowOk} text={terms.fulfillment === "pickup" ? `${terms.timeLabel} within your windows` : "Delivery does not use a pickup window"} />
        <MandateCheck ok={placeOk} text={`${terms.placeName} · ${placeOk ? "allowed" : "not allowed"}`} />
        <MandateCheck ok={includeOk} text={mandate.mustInclude.length ? `Must include ${mandate.mustInclude.join(", ")}` : "No required extras"} />
      </div>

      <details className="mt-4 border-t border-ink/15 pt-3">
        <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.08em] text-deep-blue">Edit mandate</summary>
        <div className="mt-4 space-y-4">
          <label className="field-label">
            Maximum complete price
            <span className="price-input mt-1.5"><span>$</span><input type="number" min="1" step="0.01" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></span>
          </label>
          <fieldset>
            <legend className="field-label">Pickup windows</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {availableWindows.map((window) => (
                <label key={window.id} className="flex items-center gap-2 border border-ink/15 px-3 py-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={selectedWindowIds.includes(window.id)}
                    onChange={(event) =>
                      setSelectedWindowIds(
                        event.target.checked
                          ? [...selectedWindowIds, window.id]
                          : selectedWindowIds.filter((id) => id !== window.id),
                      )
                    }
                  />
                  {window.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field-label">
            Place policy
            <select value={placePolicy} onChange={(event) => setPlacePolicy(event.target.value as "public_only" | "any")}>
              <option value="public_only">Public places only</option>
              <option value="any">Any listing-provided place</option>
            </select>
          </label>
          <fieldset>
            <legend className="field-label">Must include</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {listing.accessories.map((accessory) => (
                <label key={accessory.id} className="flex items-center gap-2 border border-ink/15 px-3 py-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={mustInclude.includes(accessory.name)}
                    onChange={(event) =>
                      setMustInclude(
                        event.target.checked
                          ? [...mustInclude, accessory.name]
                          : mustInclude.filter((name) => name !== accessory.name),
                      )
                    }
                  />
                  {accessory.name}
                </label>
              ))}
            </div>
          </fieldset>
          {notice ? <p className="flex items-start gap-2 bg-mustard-soft px-3 py-2 text-xs"><CircleAlert size={15} className="mt-0.5 shrink-0" /> {notice}</p> : null}
          <button type="button" className="primary-button w-full" disabled={saving || !maxPrice || (listing.allowsPickup && selectedWindows.length === 0)} onClick={() => void save()}>
            {saving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />} Save mandate
          </button>
        </div>
      </details>

      {blocks.length ? (
        <div className="mt-4 space-y-2 border-t border-danger/25 pt-3">
          {blocks.slice(0, 3).map((block) => (
            <p key={block.id} className="border-l-4 border-danger bg-tomato-soft px-3 py-2 text-xs leading-5 text-danger">
              {block.message}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MandateCheck({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className={`flex items-center gap-2 px-3 py-2 ${ok ? "bg-moss-soft text-moss" : "bg-tomato-soft text-danger"}`}>
      {ok ? <Check size={15} /> : <X size={15} />} {text}
    </p>
  );
}
