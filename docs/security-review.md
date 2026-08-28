# Security review

Haggle is a hackathon demo with a real persisted negotiation state machine. This note makes its trust boundaries explicit.

## Enforced controls

- Private seller floors and policy prompts stay in server-only database projections.
- The seller action is computed and floor-checked on the server. Optional model use is limited to styling an already-approved public reply; private policy is never in the model prompt.
- Every deal term is schema-validated against server-owned listing options, delivery fees, budget, state, turn, version, and round limits.
- Buyer operations are scoped to an HttpOnly, SameSite=Strict session cookie. Mutations require a same-origin browser `Origin` and JSON content type.
- Idempotency keys and optimistic version checks prevent duplicate or stale state changes.
- WebMCP result envelopes identify marketplace prose as untrusted data. The agent negotiation view omits proposal notes and history, discovery is capped, and tools expose structured option IDs.
- Public audit events are curated server-side. They do not expose raw proposal notes or negotiation IDs.
- Human approval is never an agent tool. A deal closes only after both visible human approvals.

## Demo-only boundary

Seller Studio is a persona simulator for the challenge demo. Selecting Haggler Hank, Firm Fiona, or Easygoing Eli is not authentication and must not be described as proof of seller identity. Production use would require accounts, authorization checks tied to listing ownership, abuse controls, and durable distributed rate limiting.

No OpenAI request is made unless `OPENAI_API_KEY` is configured. Before enabling a paid model on a public deployment, add a durable per-IP/session limiter at the edge or data layer.

## Accepted dependency risk

The project remains on Next.js 15 because that is the challenge stack constraint. The current audit reports a transitive PostCSS advisory through Next's compiled tooling. Haggle never accepts or compiles user-supplied CSS at runtime. Do not use a forced major-version audit fix; upgrade to a supported patched Next 15 release if one becomes available, or move to the next supported major after the challenge.
