# Haggle MVP evaluation rubric

Score each category from 0–10. A shippable slice requires at least 8 in every
category and no security invariant violation.

1. **WebMCP leverage** — tools are discoverable, compact, state-aware, and use the
   exact required API shape; dynamic registration is visible and correct.
2. **End-to-end execution** — the golden journey completes reliably without manual
   database edits or hidden setup.
3. **Human control** — budgets, private seller policies, and both final approvals are
   structurally enforced.
4. **Negotiation depth** — price and fulfillment terms are represented as structured
   data and rendered clearly.
5. **Product quality** — responsive, accessible, fast, coherent, and visually specific
   to a local marketplace.
6. **Safety and resilience** — validation, prompt-injection boundaries, concurrency,
   idempotency, model timeout/fallback, and private-field exclusion are tested.
