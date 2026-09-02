import Link from "next/link";
import { ArrowRight, Bot, Check, Eye, MousePointerClick } from "lucide-react";
import { CopyAgentPrompt } from "@/components/copy-agent-prompt";

const steps = [
  {
    icon: Bot,
    title: "Open Haggle with an agent",
    body: "Use ChatGPT's browser, or Chrome with WebMCP enabled.",
  },
  {
    icon: MousePointerClick,
    title: "Copy the prompt",
    body: "Paste the prompt below into your browser agent.",
  },
  {
    icon: Eye,
    title: "Watch the tools change",
    body: "Open Agent Lens while the buyer and seller agents work through the terms.",
  },
  {
    icon: Check,
    title: "Keep the final say",
    body: "Review the complete deal, then approve or reject it yourself.",
  },
] as const;

export default function HowToTryPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 pb-28 pt-12 sm:px-8">
      <p className="eyebrow">Two-minute judge flow</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl tracking-[-0.045em] sm:text-6xl">
        Try Haggle with your agent.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-muted">
        The human interface works everywhere. WebMCP turns the same marketplace into a structured surface your browser agent can operate.
      </p>

      <div className="mt-10 grid gap-px border border-ink/20 bg-ink/15 sm:grid-cols-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <section key={step.title} className="bg-paper-raised p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <Icon size={20} className="text-moss" />
                <span className="text-xs font-black text-ink-muted">0{index + 1}</span>
              </div>
              <h2 className="mt-5 font-display text-2xl tracking-[-0.03em]">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{step.body}</p>
            </section>
          );
        })}
      </div>

      <CopyAgentPrompt showHowToTry={false} />

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="primary-button">
          Browse bicycles <ArrowRight size={17} />
        </Link>
        <Link href="/sellers" className="secondary-button">
          Optional: open Seller Studio
        </Link>
      </div>
    </main>
  );
}
