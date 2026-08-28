"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
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
          <strong>Human mode is ready.</strong> Open in ChatGPT&apos;s browser or Chrome with the
          WebMCP testing flag for the agent experience.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="https://developer.chrome.com/docs/ai/webmcp"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 text-xs font-extrabold uppercase tracking-[0.08em] sm:flex"
          >
            Learn how <ExternalLink size={13} />
          </a>
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
