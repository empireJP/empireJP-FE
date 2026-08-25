# empireJP-FE — Test Coverage Log

A running record of the unit-test effort: what was added, why, what it found,
and what is deliberately still uncovered. Append entries at the bottom; never
rewrite history — a later entry can revise an earlier call, but the earlier
entry stays as written.

Same convention as the BE's `docs/TEST_COVERAGE_LOG.md`.

---

## 2026-08-25 — Harness from scratch + the pure-logic and money layers

**Starting point: no tests at all.** No runner, no config, no test files — the
`package.json` had `dev`/`build`/`start`/`lint` and nothing else.

### Harness

Vitest, chosen to match the BE repo (one runner, one mental model across the
two codebases) and because it needs no Babel config to read the existing
Next/TS setup.

- `vitest.config.mts` — jsdom environment (most of `lib/` is browser code:
  `sessionStorage`, `document`, `window.location`), the `@/*` alias mirrored
  from `tsconfig.json`, and `NEXT_PUBLIC_LOG_LEVEL=silent` so the many
  deliberately-driven failure paths don't bury real assertion output.
  `.mts` rather than `.ts` because Vite's native config loader warns about ESM
  syntax in a file it treats as CommonJS.
- `tests/setup.ts` — jest-dom matchers, RTL cleanup, and a `sessionStorage`
  clear between tests (the checkout store persists there; a leftover cart
  hydrates into the next test otherwise). Deliberately does **not** install a
  default `fetch` mock: a test that forgets to stub one should fail loudly
  rather than pass against a shared default.
- Scripts: `test`, `test:watch`, `test:coverage`, `typecheck`.
- Coverage excludes `lib/data.ts`, `lib/artists.ts`, `lib/dashboard.ts` and
  `lib/types.ts` — static mock catalogs and type declarations that happen to
  live in `lib/`. Counting them moves the number around without saying
  anything about test quality.

### What was covered, and why these first

Ordered by what a regression would actually cost:

- **`lib/validation.ts` → 100%/100%.** The client-side mirror of the BE's zod
  schemas, which `CLAUDE.md` and `docs/CLIENT_VALIDATION_AUDIT.md` both flag as
  drift-prone with no automatic link between the repos. Every `LIMITS` bound is
  pinned, plus the 2-character name floor that deliberately exceeds the BE's 1.

  The load-bearing test here is **`validateBuyer` and `buyerIsComplete` agree
  (no redirect loop)**: the details step gates on one and the payment step on
  the other, so a rule in one and not the other means Continue succeeds and
  payment bounces straight back, forever. Rather than assert a handful of cases
  twice, it asserts the two predicates agree across a table of drafts —
  including the "phone omitted vs. empty string" case, which is the shape most
  likely to diverge.

- **`lib/checkout.tsx` → 99.3% lines.** The cart, coupon lifecycle and order
  polling. The money assertions are the point: the discount clamp
  (`Math.min(coupon.discount, subtotal)`) is what stops a total reading *lower*
  than what the API will charge when the coupon state lags the cart by a render
  — the one direction that must never happen. Also covers dropping a
  since-rejected coupon from the order rather than failing the whole checkout
  over it, and the synchronous pre-redirect `sessionStorage` write that stops a
  KOMOJU buyer returning to an empty cart.

- **`lib/api.ts` → 97.9%.** `fetch` does not reject on 4xx — a 422 *resolves* —
  so every non-OK path is hand-rolled, and `CLIENT_VALIDATION_AUDIT.md` records
  that exact gap silently discarding profile edits for a whole release. Covers
  the 4xx→`ApiError` conversion, the `getEvent` 404→`undefined` special case
  (pages call `notFound()` on it), transport failures (the CORS case, which
  reaches JS as an indistinguishable "Failed to fetch"), and that `createOrder`
  sends tier ids and quantities only — never anything money-shaped.

- **`lib/payhere.ts` → 100%/100%.** SDK loading is where this fails in
  production: an ad blocker eating the script would otherwise present as a Pay
  button that does nothing. Covers the load timeout, the blocked-script
  rejection, the loaded-but-installed-nothing case (captive portal), that a
  failure is *not* cached so a retry gets a fresh script, and the `settled`
  guard that keeps the first outcome when PayHere fires both `onError` and
  `onDismissed` for one failure.

- **`lib/logger.ts` → 88%.** The fail-*closed* rule: an unrecognised value for
  `NEXT_PUBLIC_APP_ENV` or `NEXT_PUBLIC_LOG_LEVEL` must fall back to the
  quietest option, never the loudest — one typo in a deploy config otherwise
  ships debug logging to every visitor. `"production"` (a plausible typo for
  `"prod"`) is tested explicitly.

- **`lib/gateway-redirect.ts` → 100%/100%.** Both launch shapes, and that field
  values reach the hidden form byte-for-byte as the API signed them — any
  normalisation invalidates the gateway's hash.

- **`lib/steps.ts`, `components/QtyStepper.tsx`, `components/Pagination.tsx` →
  100%/100%.** Step order (the stepper renders progress from `stepIndex`), the
  quantity clamps, and Pagination's ellipsis window including the
  never-below-1/never-above-last edges.

### Things the tests found

Three real behaviours, none of them changed — each is pinned by a test with a
comment saying it is pinned rather than endorsed, so a future fix is deliberate
and visible:

1. **`money()` drops a trailing zero.** `minimumFractionDigits: 0` applies to
   the fractional case too, so a $45.50 ticket renders as **"$45.5"** and
   $1,234.50 as **"$1,234.5"**. The fix is a *minimum* of 2 whenever the value
   isn't an integer, matching the existing maximum. Left alone because it
   changes what every buyer sees — this is a product call, not a test fix.

2. **Two concurrent `startPayHerePayment` calls strand the first.** The SDK
   dispatches through one set of *global* handlers
   (`onCompleted`/`onDismissed`/`onError`), so a second attempt started before
   the first settles overwrites the first's handlers and the first promise
   never resolves at all. Harmless today — a buyer can only work one popup —
   but it means the function must never be called concurrently for two
   different orders. My first draft of that test asserted both promises
   resolve; the timeout is what surfaced the real semantics.

3. **Every log line carries a stray `{}`.** `createLogger` binds
   `emit(..., { ...base, ...fields })`, so it always hands over an object —
   `{}` when there is neither. `emit`'s `else CONSOLE[level](label)` branch is
   therefore unreachable through the public API, and devtools shows a trailing
   empty object on every line. Cosmetic.

### Two harness gotchas worth remembering

- **`logger.ts` binds console methods at module load** (`console.debug.bind(console)`
  into a lookup table), so a spy installed *after* the import is never seen.
  The tests spy first, then dynamic-import — see `spiedLoggerWith`.
- **PayHere's handlers are assigned inside the `.then` after the script's
  `onload`**, so firing `onDismissed` in the same tick as the simulated load
  finds the property unset. Hence the `flush()` helper.

### Result

**201 tests across 10 files, all passing.** `npx tsc --noEmit` clean;
`npx eslint lib app components` holds at the documented 8-error
`set-state-in-effect` baseline with no new errors.

Headline coverage is **34.6% statements / 35.2% lines**, which needs reading in
context: every module deliberately targeted is at or near 100%, and the number
is dragged down by 24 untested presentational components plus three untested
`lib` files. Per-area:

| Area | Lines |
|---|---|
| `lib/validation.ts`, `format.ts`, `steps.ts`, `payhere.ts`, `gateway-redirect.ts` | 100% |
| `lib/checkout.tsx` | 99.3% |
| `lib/api.ts` | 97.9% |
| `lib/logger.ts` | 86.4% |
| `components/` (2 of 26 files tested) | 9.7% |

**Reporter quirk, not a gap:** the v8 text reporter drops fully-covered files
from the printed table under non-TTY output — `validation.ts`, `format.ts`,
`steps.ts`, `payhere.ts`, `gateway-redirect.ts`, `QtyStepper.tsx` and
`Pagination.tsx` do not appear as rows despite being at 100%. Verified against
`coverage/coverage-final.json` directly. Same behaviour as the BE repo; if CI
ever parses the printed table, read the JSON instead.

### Deliberately not covered yet

- **`lib/user.tsx`** (0%) — the profile/session store. Real logic worth testing
  (the optimistic-update rollback that `CLIENT_VALIDATION_AUDIT.md` records
  being broken), but it needs `better-auth`'s client mocked, which is a bigger
  setup than the rest of this pass. **Highest-value next target.**
- **`lib/geocode.ts`** (0%) — Nominatim lookup with a widen-on-miss chain and a
  deliberate two-pass country-bias order the comments call load-bearing.
  Testable with a stubbed `fetch`; second next target.
- **`lib/auth-client.ts`** (0%) — three lines of better-auth wiring, no logic.
- **The 24 remaining components** — mostly presentational. The ones with real
  behaviour, in rough priority: `OrderSummary` (coupon field + totals
  rendering), `GetTicketsButton` (ended / sales-closed / sold-out reasons),
  `TicketsPanel`, `NavSearch`, `TrailerButton`, `SubscribeButton`.
- **`app/` routes** — no page-level or integration tests. Would need Next's
  router and server-component boundaries mocked; a different kind of test from
  everything above and worth deciding on separately.

---
