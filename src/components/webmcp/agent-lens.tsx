"use client";

import { Bot, Check, CircleAlert, Clock3, Radio, X } from "lucide-react";
import { useWebMcp } from "./webmcp-provider";

export function AgentLens() {
  const {
    support,
    tools,
    lensOpen,
    setLensOpen,
    lastContextSyncAt,
    lastSurfaceChange,
    lastExecution,
  } = useWebMcp();

  const contextual = tools.filter((tool) => tool.kind === "contextual");
  const base = tools.filter((tool) => tool.kind === "base");

  return (
    <>
      {lensOpen ? (
        <button
          type="button"
          aria-label="Close Agent Lens"
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[1px]"
          onClick={() => setLensOpen(false)}
        />
      ) : null}
      <aside
        aria-label="Agent Lens"
        aria-hidden={!lensOpen}
        className={`agent-lens ${lensOpen ? "agent-lens-open" : ""}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink/15 px-5 py-5">
          <div>
            <p className="eyebrow">Agent Lens</p>
            <h2 className="mt-1 font-display text-3xl tracking-[-0.035em]">What the agent sees</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setLensOpen(false)}
            aria-label="Close Agent Lens"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-3 border-b border-ink/15 pb-5">
            <span className={`connection-dot connection-${support}`} />
            <div>
              <p className="text-sm font-extrabold">
                {support === "available"
                  ? "WebMCP connected"
                  : support === "checking"
                    ? "Checking WebMCP"
                    : "WebMCP unavailable"}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {lastContextSyncAt
                  ? `Surface synced ${new Date(lastContextSyncAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
                  : "Waiting for the first surface sync"}
              </p>
            </div>
          </div>

          <LensSection title="Available now" icon={<Radio size={15} />}>
            {contextual.length ? (
              contextual.map((tool) => <ToolRow key={tool.name} tool={tool} />)
            ) : (
              <p className="border-l-2 border-ink/20 pl-3 text-sm leading-6 text-ink-muted">
                Inspect an active listing or wait for a seller response to reveal contextual tools.
              </p>
            )}
          </LensSection>

          <LensSection title="Always available" icon={<Bot size={15} />}>
            {base.map((tool) => <ToolRow key={tool.name} tool={tool} />)}
          </LensSection>

          <LensSection title="Latest activity" icon={<Clock3 size={15} />}>
            {lastExecution ? (
              <div className="border-l-2 border-deep-blue pl-3">
                <code className="text-xs font-bold text-deep-blue">{lastExecution.toolName}</code>
                <p className="mt-1 text-sm capitalize">{lastExecution.phase}</p>
                {lastExecution.summary ? (
                  <p className="mt-1 text-xs leading-5 text-ink-muted">{lastExecution.summary}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No WebMCP tool has been called yet.</p>
            )}
            {lastSurfaceChange ? (
              <p className="mt-4 bg-moss-soft px-3 py-2 text-xs font-semibold text-moss">
                Surface changed: {lastSurfaceChange}
              </p>
            ) : null}
          </LensSection>
        </div>
      </aside>
    </>
  );
}

function LensSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-ink-muted">
        {icon}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToolRow({ tool }: { tool: ReturnType<typeof useWebMcp>["tools"][number] }) {
  return (
    <div className="tool-row">
      <div className="flex items-center justify-between gap-3">
        <code className="text-xs font-extrabold text-deep-blue">{tool.name}</code>
        {tool.state === "registered" ? (
          <Check size={14} className="text-moss" aria-label="Registered" />
        ) : tool.state === "failed" ? (
          <CircleAlert size={14} className="text-danger" aria-label="Registration failed" />
        ) : (
          <span className="size-2 animate-pulse rounded-full bg-mustard" aria-label="Registering" />
        )}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-ink-muted">{tool.reason}</p>
      {tool.error ? <p className="mt-1 text-xs text-danger">{tool.error}</p> : null}
    </div>
  );
}
