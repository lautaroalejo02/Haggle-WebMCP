"use client";

import { useCallback, useEffect, useState } from "react";

type AuditEvent = {
  id: string;
  text: string;
  createdAt: string;
};

const fallbackEvent: AuditEvent = {
  id: "ready",
  text: "🤖 Haggle is ready for its first agent-negotiated deal",
  createdAt: new Date().toISOString(),
};

export function AuditTicker() {
  const [event, setEvent] = useState(fallbackEvent);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/events?limit=1", { cache: "no-store" });
      if (!response.ok) return;
      const result = (await response.json()) as { data?: AuditEvent[] };
      if (result.data?.[0]) setEvent(result.data[0]);
    } catch {
      // The human marketplace remains usable while the database is being configured.
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
    <div className="audit-ticker" aria-live="off">
      <div className="mx-auto flex h-full max-w-[82.5rem] items-center gap-4 px-5 sm:px-8">
        <span className="flex shrink-0 items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.14em] text-mint">
          <span className="size-1.5 animate-pulse rounded-full bg-mint" />
          Live market
        </span>
        <span className="h-4 w-px bg-paper/25" />
        <p key={event.id} className="animate-ticker-in truncate text-xs text-paper sm:text-sm">
          {event.text}
        </p>
      </div>
    </div>
  );
}
