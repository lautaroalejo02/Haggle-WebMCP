# Three-minute WebMCP demo

## Setup

- Use the seeded Moss Green Trek FX 2 listing.
- Start from a fresh browser session.
- Keep Agent Lens closed at first, then open it during the seller turn.
- Confirm the database has been seeded and the listing is active.

## Storyboard

| Time | Demo action | What it proves |
| ---: | --- | --- |
| 0:00 | Explain that local deals include price, handoff, public place, timing, and extras. | The problem is richer than checkout. |
| 0:12 | Show the home page, WebMCP status, and human fallback. | Progressive enhancement. |
| 0:22 | Ask the browser agent to set a $190 budget and find the Moss Green Trek FX 2. | Search and a server-side guardrail. |
| 0:35 | Ask it to offer $165 for Saturday pickup near downtown, without approving. | A structured WebMCP mutation. |
| 0:50 | Open Agent Lens while Haggler Hank considers the proposal. | Inspectable agent behavior. |
| 1:05 | Show the $185 counter at Riverside Library with the U-lock. | Resident seller agent plus private constraints. |
| 1:20 | Point out that `make_offer` was removed and response tools appeared. | Dynamic WebMCP surface. |
| 1:35 | Let the buyer agent accept the seller's terms. | Agent can negotiate, not finalize. |
| 1:50 | Approve as the buyer human. | Explicit buyer control. |
| 2:05 | Open Seller Studio and approve as the seller human. | Explicit seller control. |
| 2:25 | Show the closed deal and audit trail. | Complete, understandable execution. |
| 2:45 | Close: agents negotiate private constraints; people retain control. | Product thesis. |

## Suggested prompt

> Set my total budget to $190. Find the Moss Green Trek FX 2 and offer $165 for Saturday pickup near downtown. Negotiate within my budget, but do not approve anything for me.

## Recovery

If the model call is unavailable or invalid, the safe deterministic seller policy must produce the same valid golden-path counter. The UI should never expose the seller floor or raw model error.
