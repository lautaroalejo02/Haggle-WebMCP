"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const prompt =
  "Find me a commuter bike under $190. I can pick up Saturday near downtown. Negotiate, but don't approve without me.";

export function CopyAgentPrompt() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-8 max-w-2xl border-l-4 border-signal bg-paper-raised px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-ink-muted">Try with your browser agent</p>
          <p className="mt-2 text-sm leading-6">“{prompt}”</p>
        </div>
        <button
          type="button"
          className="icon-button shrink-0"
          aria-label="Copy agent prompt"
          onClick={async () => {
            await navigator.clipboard.writeText(prompt);
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
