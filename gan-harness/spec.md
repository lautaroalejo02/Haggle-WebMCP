# Haggle MVP specification

Haggle is a Next.js 15 local bicycle marketplace for humans and browser agents.
The first complete journey lets an anonymous buyer set a total budget, discover a
bicycle, negotiate structured terms with a resident seller agent, and close only
after separate buyer and seller human approvals.

## Locked requirements

- Next.js App Router, strict TypeScript, Tailwind CSS, Neon Postgres, Drizzle ORM.
- Exact user-supplied WebMCP registration and result shape in one provider module.
- Feature detection via `document.modelContext ?? navigator.modelContext`.
- Dynamic tools are removed with `unregisterTool(name)`.
- Terms include price, pickup/delivery, a safe public meeting place, time window,
  delivery fee, and optional included accessory.
- Seller floor, buyer total budget, turn order, round limit, listing availability,
  and both approvals are enforced outside the model.
- No exact private address is exposed by a tool or API.
- The experience works without WebMCP and explains how to enable it.

## Golden journey

`set_budget → search_listings → get_listing → make_offer → seller counter →
dynamic tool change → accept_deal → buyer approval → seller approval → closed`
