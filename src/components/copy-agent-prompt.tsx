"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Link from "next/link";

export const AGENT_PROMPT =
  "Find me a commuter bike under $190. I can pick up Saturday near downtown. Negotiate, but don't approve without me.";

export function CopyAgentPrompt({ showHowToTry = true }: { showHowToTry?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-8 max-w-2xl border-l-4 border-signal bg-paper-raised px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-ink-muted">Try with your browser agent</p>
          <p className="mt-2 text-sm leading-6">“{AGENT_PROMPT}”</p>
          {showHowToTry ? (
            <Link href="/how-to-try" className="mt-2 inline-block text-xs font-extrabold text-deep-blue underline decoration-1 underline-offset-2">
              How to try
            </Link>
          ) : null}
        </div>
        <button
          type="button"
          className="icon-button shrink-0"
          aria-label="Copy agent prompt"
          onClick={async () => {
            await navigator.clipboard.writeText(AGENT_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 1_500);
          }}
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
        </button>
      </div>
    </div>
  );
}
