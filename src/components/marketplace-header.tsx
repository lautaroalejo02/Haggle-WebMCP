"use client";

import Link from "next/link";
import { Bot, CircleUserRound } from "lucide-react";
import { useWebMcp } from "@/components/webmcp/webmcp-provider";

export function MarketplaceHeader() {
  const { support, tools, setLensOpen } = useWebMcp();
  const activeCount = tools.filter((tool) => tool.state === "registered").length;

  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[82.5rem] items-center justify-between gap-5 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-2xl font-black tracking-[-0.04em]">
            Haggle<span className="text-signal">.</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm font-bold md:flex">
            <Link href="/" className="hover:text-signal">Browse</Link>
            <Link href="/my-negotiations" className="hover:text-signal">My deals</Link>
            <Link href="/sellers" className="hover:text-signal">Seller studio</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="connection-button"
            onClick={() => setLensOpen(true)}
            aria-label="Open Agent Lens"
          >
            <span className={`connection-dot connection-${support}`} />
            <span className="hidden sm:inline">
              {support === "available"
                ? `Page tools · ${activeCount}`
                : support === "unavailable"
                  ? "WebMCP off"
                  : support === "error"
                    ? "Registration error"
                    : "Checking WebMCP"}
            </span>
            <Bot size={16} />
          </button>
          <Link href="/my-negotiations" className="icon-button" aria-label="My deals">
            <CircleUserRound size={19} />
          </Link>
        </div>
      </div>
    </header>
  );
}
