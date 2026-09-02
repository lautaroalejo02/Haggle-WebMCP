# Seller response wait — TDD evidence

- Journey: after making a buyer proposal, a browser agent can wait read-only for the seller's asynchronous response instead of guessing when to poll.
- RED: `npm test -- tests/unit/wait-for-seller-response.test.ts` failed because the wait module did not exist.
- GREEN: the same command passed 2 tests covering response detection, timeout, the 25-second default, and the 45-second cap.
- Full verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run test:coverage` passed.
- Coverage: configured project scope passed at 99.18% statements, 94.77% branches, 100% functions, and 99.14% lines.

The long-poll route has a 60-second function limit, while caller-controlled waiting is capped at 45 seconds.
