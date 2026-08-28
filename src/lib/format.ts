export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatRelativeTime(value: Date | string): string {
  const timestamp = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.round((Date.now() - timestamp.getTime()) / 1000));
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
