import { Check, Minus, X } from "lucide-react";

export type ApprovalDiffRow = {
  label: string;
  value: string;
  state: "good" | "warning" | "neutral";
};

export function ApprovalDiff({ title, rows }: { title: string; rows: ApprovalDiffRow[] }) {
  return (
    <section className="mt-4 border-y border-ink/15 py-3" aria-label={title}>
      <p className="eyebrow">{title}</p>
      <dl className="mt-2 divide-y divide-ink/10">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[5.25rem_1fr_auto] items-center gap-2 py-2 text-xs">
            <dt className="font-extrabold uppercase tracking-[0.07em] text-ink-muted">{row.label}</dt>
            <dd className="font-semibold leading-5">{row.value}</dd>
            <dd aria-label={row.state === "good" ? "Within limits" : row.state === "warning" ? "Needs review" : "For review"}>
              {row.state === "good" ? (
                <Check size={16} className="text-moss" />
              ) : row.state === "warning" ? (
                <X size={16} className="text-danger" />
              ) : (
                <Minus size={16} className="text-ink-muted" />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
