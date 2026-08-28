"use client";

import type { ReactNode } from "react";
import { AgentLens } from "@/components/webmcp/agent-lens";
import { WebMcpBanner } from "@/components/webmcp/webmcp-banner";
import { WebMcpProvider } from "@/components/webmcp/webmcp-provider";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { AuditTicker } from "@/components/audit-ticker";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WebMcpProvider>
      <MarketplaceHeader />
      <WebMcpBanner />
      {children}
      <AgentLens />
      <AuditTicker />
    </WebMcpProvider>
  );
}
