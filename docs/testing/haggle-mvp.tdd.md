# Haggle MVP TDD evidence

The core negotiation and public-contract work followed a RED → GREEN loop. This record preserves the intended behavior and the observed failing/passing boundaries while the project remains uncommitted.

## Negotiation state machine

### RED

`tests/unit/state-machine.test.ts` was added before the production state-machine module. The first Vitest run failed because `src/lib/negotiation/state-machine.ts` did not exist.

The tests specified:

- initial buyer proposal and seller turn
- listing asking-price bounds (1%–500%)
- budget enforcement against item plus delivery total
- pickup/delivery field consistency
- seller counters and buyer counters
- maximum five buyer rounds
- seller floor enforcement
- acceptance into frozen human-approval terms
- separate buyer and seller approvals
- idempotent repeated approval

### GREEN

`src/lib/negotiation/state-machine.ts` was implemented and all 14 state-machine tests passed.

## Public marketplace contracts

### RED

`tests/unit/marketplace-contracts.test.ts` was added before `src/lib/marketplace/contracts.ts`. The first run failed on the missing production module.

The tests specified:

- private seller fields never appear in public listing results
- internal cents convert correctly to public USD values
- possible next actions follow the server negotiation state
- tool results use compact, explicit success/error envelopes

### GREEN

`src/lib/marketplace/contracts.ts` was implemented and all 6 contract tests passed.

## Backend input boundary

### RED

`tests/unit/backend-inputs.test.ts` was written before the route input parsers and initially failed on its missing production module.

### GREEN

The server input schemas and route boundary were implemented, then run with the complete suite.

## Current verification command

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
```

The final verification output should be recorded in the release handoff rather than manually copied here, so this document cannot drift from the actual test runner.
