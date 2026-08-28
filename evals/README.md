# WebMCP eval cases

`webmcp-cases.json` follows the `messages` plus `expectedCall` shape described in Chrome's WebMCP eval guidance. It covers direct tool selection, required call ordering, contextual tool changes, forbidden human-approval automation, private-location safety, and a mid-chain budget failure.

The placeholder `<active-negotiation-id>` must be replaced by the ID produced while preparing the seller-counter state.

These probabilistic eval cases complement deterministic Vitest and Playwright tests; they do not replace them.

Reference: <https://developer.chrome.com/docs/ai/webmcp/evals>
