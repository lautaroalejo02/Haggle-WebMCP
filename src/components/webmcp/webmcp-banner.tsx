"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useWebMcp } from "./webmcp-provider";

export function WebMcpBanner() {
  const { support } = useWebMcp();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("haggle-webmcp-banner") === "dismissed");
  }, []);

  if (support !== "unavailable" || dismissed) return null;

  return (
    <div className="border-b border-mustard/40 bg-mustard-soft px-5 py-2.5 text-sm text-ink">
      <div className="mx-auto flex max-w-[82.5rem] items-center justify-between gap-5">
        <p>
          <strong>WebMCP isn&apos;t available in this browser.</strong> These tools activate in ChatGPT&apos;s browser or Chrome with WebMCP enabled.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/how-to-try"
            className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-[0.08em]"
          >
            How to try
          </Link>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss WebMCP notice"
            onClick={() => {
              sessionStorage.setItem("haggle-webmcp-banner", "dismissed");
              setDismissed(true);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
