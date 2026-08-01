# Client-side validation audit — empireJP-FE (buyer)

Branch: `feat/client-side-validation` (off `dev`)

**Status: all findings below are fixed on this branch.** The audit is kept as
the record of what was wrong and why. What landed:

- `lib/validation.ts` — pure validators mirroring the BE schemas, no new
  dependency. `LIMITS` is the one place to change when a BE rule moves.
- `lib/user.tsx` — `updateProfile` now checks `res.ok`, rolls the optimistic
  update back on failure, and returns a message instead of resolving silently.
- `app/account/page.tsx` — validates before saving, reports real failures, and
  the email field is read-only.
- `app/checkout/details/page.tsx` — name and phone bounded, per-field messages.
- `app/checkout/payment/page.tsx` — redirects to the details step when the
  buyer is incomplete.
- `components/OrderSummary.tsx` — coupon trimmed, bounded, Apply disabled empty.
- `app/checkout/tickets/page.tsx` — distinct-tier cap enforced.

`npx tsc --noEmit` is clean; `npx eslint lib app components` holds at the
documented 8-error baseline (no new errors).

Authoritative rules come from the BE zod schemas
(`empireJP-BE/src/modules/*/**.schemas.ts`) — appendix at the bottom.

The headline problem in this app is different from the dashboard's: the
dashboard shows a generic error, this one shows **no error at all**. The account
settings form reports success on a request it never checked.

## What is already correct

- **`app/signin/page.tsx` and `app/checkout/signin/page.tsx`** — email regex
  before sending the OTP, `/^\d{6}$/` before verifying, non-digits stripped on
  input, `maxLength={6}`, `autoComplete="one-time-code"`, errors cleared on
  edit. This is the pattern to copy.
- **`components/QtyStepper.tsx`** — hard-bounded at both ends; the tickets page
  passes `Math.min(t.available, 8)`, comfortably inside the BE's per-line
  `max(20)`.
- **Continue-from-tickets** is disabled at `totals.count === 0`.
- **`app/checkout/payment/page.tsx`** — distinguishes an abandoned popup from a
  declined card, and handles an empty payment-method list as an explanation
  rather than a blank screen.

---

## P0 — Account settings save silently discards invalid input

`app/account/page.tsx:167` and `lib/user.tsx:152`

Three defects compound into one bad outcome.

### 1. `saveSettings()` validates nothing and always claims success

```ts
function saveSettings() {
  updateProfile(form);
  setSaved(true);              // unconditional
  setTimeout(() => setSaved(false), 1800);
}
```

### 2. `updateProfile()` never checks `res.ok`

```ts
void fetch(`${API_URL}/api/v1/me`, { method: "PATCH", ... })
  .catch((err) => { log.error("profile update was not persisted", ...) });
```

`fetch` only rejects on a network failure. A **422 resolves**, so `.catch` never
fires, nothing is logged, and the optimistic local update stays on screen. The
comment directly above it describes exactly this failure — "looks like a save
that worked and silently didn't survive the next reload" — but the code only
guards the network case. It is also the failure mode `CLAUDE.md` calls out as
the thing to hunt.

**Fix:** check `res.ok`, surface the message, roll back the optimistic update,
and log at `error` with the field names (not the body).

### 3. The fields that trigger it

| Field | BE rule (`patchMeSchema`) | What the form allows |
|---|---|---|
| `name` | `trim().min(1).max(120)` | cleared to `""` → 422, silently lost |
| `city` | `trim().min(1).max(80)` | cleared to `""` → 422, silently lost |
| `phone` | `trim().max(32)` | unbounded; `""` is legal (means unset) |
| `email` | **not in the schema** | editable input, silently stripped |

The email input (line 355) deserves its own note: `patchMeSchema` is a
non-strict `z.object`, so `email` is dropped, not rejected. The user edits it,
sees "Saved", and nothing happens — ever. Email is the auth identity and cannot
be changed here, so the field should be read-only with an explanatory note.

---

## P1 — Checkout details

`app/checkout/details/page.tsx`

### 4. Name has a client minimum but no maximum

`proceed()` checks `name.trim().length < 2`. The BE is `min(1).max(120)`. A name
over 120 characters passes this screen and fails one step later at
`POST /orders`, where the error reads as a payment problem rather than a name
problem.

### 5. Phone is completely unvalidated

BE is `trim().max(32)`. No length cap, no shape check, `inputMode="tel"` only
changes the keyboard. Same delayed-failure path as above.

### 6. Errors appear only on Continue

`setError("")` runs on every keystroke, so there is no blur validation and no
positive confirmation that the field is now acceptable.

---

## P1 — The payment step can be reached without buyer details

`app/checkout/payment/page.tsx`

The details step is the only thing that populates `buyer.name`, and it is
enforced purely by forward navigation. Any path that lands on
`/checkout/payment` directly — browser back/forward, a restored tab, a bookmark
— reaches a fully functional Pay button with `buyer.name === ""`.

`createOrderSchema` requires `buyer.name: trim().min(1).max(120)`, so the order
POST 422s at the single worst moment in the funnel, after the buyer has
committed to paying.

**Fix:** guard the step the way `/checkout/tickets` guards sign-in — redirect to
`/checkout/details` when the buyer is incomplete.

---

## P2 — Coupon field

`components/OrderSummary.tsx:93`

`validateCouponSchema` requires `code: trim().min(1).max(64)`. The input has no
`maxLength`, and `submit()` sends whatever is there — including an empty string
if the user hits Apply on an untouched field. Trim and length-check before the
call, and disable Apply while empty.

---

## P2 — Distinct-tier cap

`app/checkout/tickets/page.tsx`

Per-tier quantity is capped at 8, well inside the BE's `qty max(20)`. But
`cartLinesSchema` also caps the array at `max(10)` **distinct tiers**, and
nothing on the client counts them. Only reachable on an event with 11+ tiers, so
it is a real but narrow gap — worth a guard rather than a redesign.

---

## Cross-cutting

### 7. No shared validators

Every check is written inline at its call site. The email regex in
`app/signin/page.tsx` and `app/checkout/signin/page.tsx` is already duplicated
verbatim. The agreed direction is a small `lib/validation.ts` of pure functions
mirroring the BE rules — no new dependency.

### 8. Error styling is inconsistent

`text-danger` on the sign-in pages, `text-accent` on checkout details. Errors
should not read as an accent colour.

---

## Appendix — authoritative BE rules

**`PATCH /api/v1/me`** (`me.schemas.ts`)

| Field | Rule |
|---|---|
| `name` | `trim().min(1).max(120)` optional |
| `phone` | `trim().max(32)` optional — `""` means unset, stored NULL |
| `city` | `trim().min(1).max(80)` optional |
| `notifyDrops`, `notifyReminders` | boolean optional |

Unknown keys (`email`, `picture`) are **stripped, not rejected**.

**`POST /api/v1/orders`** (`orders.schemas.ts`)

| Field | Rule |
|---|---|
| `eventSlug` | `min(1)` |
| `lines` | array `min(1).max(10)`, no duplicate `tierId` |
| `lines[].qty` | `int().min(1).max(20)` |
| `buyer.name` | `trim().min(1).max(120)` |
| `buyer.email` | valid email, `max(254)` |
| `buyer.phone` | `trim().max(32)` optional |
| `couponCode` | `trim().min(1).max(64)` optional |
| `paymentProvider` | enum `mock` / `payhere`, optional |

Prices are never client-sent — the cart carries tier ids and quantities only.

**`POST /api/v1/coupons/validate`** — `code: trim().min(1).max(64)`,
`eventSlug: min(1)`, same `lines` contract as order creation.
