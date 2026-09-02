# Haggle — tonight's delivery

All five requested tasks shipped in order. The mandatory gate—TypeScript, ESLint, the full then-current unit suite (ending at 52 tests), and the Next.js production build—was green before every task commit.

## Task status

| Task | Status | Commit | What shipped |
| --- | --- | --- | --- |
| 1. Agent Lens preview catalog | Done | `d4321ec` | The inactive browser preview uses the same tool definitions as live registration, shows descriptions and collapsible schemas, links to `/how-to-try`, and leaves live registration unchanged. |
| 2. Seller Studio session isolation | Done | `e35f8ee` | Seller queues and approvals require the buyer session cookie. A different browser session sees no queue item and receives 404 if it attempts approval. |
| 3. Non-terminal decline | Done | `907e2df` | “Decline & keep negotiating” records `human_declined`, preserves the open negotiation, gives the buyer agent the private reason and rejected terms, and gives the other side only a rejection notice. `get_negotiation_status` is read-only and side-effect free. |
| 4. Buyer mandate | Done | `700fc10` | Flagged mandate tools, editable UI, server enforcement on buyer offer/counter/accept, structured `BLOCKED_BY_MANDATE` errors, block timeline entries, migration, and five validator cases. |
| 5. Approval diff | Done | `b74a17c` | Buyer and seller takeovers now compare price, method, time, place, and included extras. Seller boundaries are checked server-side and their values are omitted from the response. |
| Tool annotations | Done | `cb7c847` | Current Chrome imperative-API `readOnlyHint` and `untrustedContentHint` annotations are passed through registration and covered by the WebMCP browser test. |

The deterministic browser test also completes the full buyer decline → agent revision → buyer approval → session-isolated seller approval → closed deal path.

## Assumptions

- The demo session cookie is the visitor identity for both marketplace and Seller Studio. Seller Studio remains clearly labeled as a judging persona simulator, not production authentication.
- A buyer has at most one active negotiation per listing, so the mandate is stored per buyer session and listing and linked to that negotiation.
- Listing-provided pickup places are public places; delivery destinations remain coarse public zones. Private addresses never enter a proposal.
- The existing deal model negotiates one included accessory. `mustInclude` is stored as a list and every named item is enforced; the current seeded demo uses one required item, such as the U-lock.
- The original spending budget remains the exact guardrail while the mandate flag is off. When the flag is on, its value seeds the mandate default; the editable mandate becomes the authoritative boundary.
- Seller-generated messages remain untrusted data. Tool results retain the security notice and WebMCP tools that can return marketplace or seller content carry `untrustedContentHint: true`.

## Feature flags

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_FEATURE_MANDATE` | `false` | When `true`, registers mandate tools, renders the buyer Mandate card and approval comparisons, stores mandates, and enforces them server-side. When off, the route is unavailable, mandate tables are not queried, and existing budget behavior is unchanged. |

## Manual steps

No manual step remains for the linked production deployment. `NEXT_PUBLIC_FEATURE_MANDATE=true` is set, the additive migration is applied to its configured database, the OpenAI key and Luna model are present, and [haggle-web-mcp.vercel.app](https://haggle-web-mcp.vercel.app) is deployed and verified.

For a different Vercel project or database:

1. Set `NEXT_PUBLIC_FEATURE_MANDATE=true`, `DEMO_MODE=true`, `OPENAI_MODEL=gpt-5.6-luna`, `DATABASE_URL`, and optionally `OPENAI_API_KEY`, then deploy. The public feature flag is read at build time.
2. Run `npm run db:migrate` once against that database. Migration `drizzle/0002_rapid_callisto.sql` is additive.
3. Seed only a new, empty database. No destructive reset is required for the current demo.

## Three-minute demo shot list

1. **0:00 — Give the task.** In ChatGPT's browser: “Set my mandate to $180 max, Saturday 2–4 PM, public pickup, U-lock included. Find the Trek and offer $165. Negotiate, but never approve for me.”
2. **0:20 — Show Agent Lens.** Open it while the agent searches and inspects the Trek. Point out the read-only base tools, then the contextual mandate and offer tools.
3. **0:40 — Seller counters.** Haggler Hank returns $185, Riverside Library, Saturday 2–4 PM, U-lock included.
4. **0:55 — Show the site enforcing the mandate.** Ask the agent to accept. Haggle returns `BLOCKED_BY_MANDATE`; the red timeline entry says the site—not the agent—blocked $185 over the $180 maximum.
5. **1:15 — Renegotiate into bounds.** Ask the agent to counter at $180. The seller accepts and the approval takeover shows every term against the mandate.
6. **1:40 — Human declines with a reason.** Enter “Try $175 if the lock stays included,” then choose “Decline & keep negotiating.” Show that the buyer agent can read the reason while the seller side cannot.
7. **2:00 — Agent renegotiates.** The agent counters at $175, reaches provisional terms, and returns control to the human. Approve on the buyer side.
8. **2:25 — Seller approves and the deal closes.** Open Seller Studio, show the private-limit comparison without the private value, approve the sale, then return to the listing for “Both people said yes.”
9. **2:50 — End on the generalization.** Return home and hold on: “Bikes today. Any local deal tomorrow.”
