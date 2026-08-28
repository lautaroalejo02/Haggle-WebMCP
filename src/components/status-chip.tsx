import { clsx } from "clsx";

const labels = {
  seller_turn: "Seller is considering",
  buyer_turn: "Your turn",
  agreed_pending_approval: "Approval needed",
  closed_deal: "Deal closed",
  rejected: "Negotiation ended",
  expired: "Offer window closed",
} as const;

export function StatusChip({ status }: { status: keyof typeof labels }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.11em]",
        status === "buyer_turn" && "bg-sky-soft text-deep-blue",
        status === "seller_turn" && "bg-mustard-soft text-ink",
        status === "agreed_pending_approval" && "bg-moss-soft text-moss",
        status === "closed_deal" && "bg-moss text-paper-raised",
        (status === "rejected" || status === "expired") && "bg-tomato-soft text-danger",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
