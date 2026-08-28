import { MapPin, PackageCheck, Truck } from "lucide-react";
import { formatUsd } from "@/lib/format";

type DealSlipProps = {
  itemPriceCents: number;
  deliveryFeeCents?: number;
  fulfillment: "pickup" | "delivery";
  place: string;
  time: string;
  accessory?: string | null;
  stamp?: string;
};

export function DealSlip({
  itemPriceCents,
  deliveryFeeCents = 0,
  fulfillment,
  place,
  time,
  accessory,
  stamp = "CURRENT TERMS",
}: DealSlipProps) {
  const total = itemPriceCents + deliveryFeeCents;

  return (
    <div className="deal-slip">
      <div className="flex items-center justify-between gap-4 border-b border-dashed border-ink/25 pb-3">
        <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-ink-muted">
          Current terms
        </p>
        <span className="-rotate-2 border-2 border-signal px-2 py-0.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-signal">
          {stamp}
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-6">
          <dt>Bike</dt>
          <dd className="font-bold tabular-nums">{formatUsd(itemPriceCents)}</dd>
        </div>
        {deliveryFeeCents > 0 ? (
          <div className="flex justify-between gap-6 text-ink-muted">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{formatUsd(deliveryFeeCents)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-6">
          <dt className="flex items-center gap-1.5">
            {fulfillment === "pickup" ? <MapPin size={14} /> : <Truck size={14} />}
            Method
          </dt>
          <dd className="text-right font-semibold capitalize">{fulfillment}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Place</dt>
          <dd className="text-right font-semibold">{place}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt>Time</dt>
          <dd className="text-right font-semibold">{time}</dd>
        </div>
        {accessory ? (
          <div className="flex justify-between gap-6">
            <dt className="flex items-center gap-1.5">
              <PackageCheck size={14} /> Included
            </dt>
            <dd className="text-right font-semibold">{accessory}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex items-baseline justify-between border-t border-ink/20 pt-3">
        <span className="text-xs font-extrabold uppercase tracking-[0.12em]">Total</span>
        <strong className="font-display text-3xl tracking-[-0.04em] tabular-nums">
          {formatUsd(total)}
        </strong>
      </div>
    </div>
  );
}
