@AGENTS.md

# empireJP-FE (buyer frontend) — working notes for agents

Talks to empireJP-BE over `NEXT_PUBLIC_API_URL`. Run `npx tsc --noEmit` and
`npx eslint lib app components` before calling work done. The lint baseline is
8 pre-existing `set-state-in-effect` errors — don't add to it.

If a client-side call to the API fails with no obvious cause, check that this
app's origin is listed in the BE's `FRONTEND_ORIGINS`. A CORS rejection reaches
JS as an ordinary "Failed to fetch", and server components are unaffected, so it
looks like an empty page rather than an error.

## Validation is part of the form, not something the API does for you

**Every input that reaches the API gets a client-side check first, in
`lib/validation.ts`.** The BE is still the only authority — this layer exists so
a buyer learns their phone number is too long while looking at the phone field,
not two steps later when the order POST fails and the 422 reads as a payment
problem.

- Rules live in `lib/validation.ts` as **pure functions**, mirroring the zod
  schemas in `empireJP-BE/src/modules/**/*.schemas.ts`. `LIMITS` is the single
  place to edit when a BE rule moves. No form library, no new dependency.
- **When you add or change a field, check the BE schema and mirror it.** Every
  bound (`min`, `max`, `.int()`, enums) and every cross-field `.refine()`.
  `docs/CLIENT_VALIDATION_AUDIT.md` has the current rules field by field.
- Derive errors during render from the draft; don't mirror them into state.
- Validate on submit, then live. Track *touched* per field — blurring one field
  must not flag one the user hasn't reached yet.
- Don't disable the submit button on invalid input. A greyed-out button can't
  say why; pressing it should surface the messages.

### Things that look like validation and aren't

- **`maxLength` is not a validator.** It truncates paste silently — on a name
  that means issuing a ticket under something the buyer never typed — and it
  makes the matching "must be N characters or fewer" message unreachable. Let
  the validator speak.
- **`fetch` does not reject on 4xx.** A 422 *resolves*, so `.catch` never runs.
  Check `res.ok`, roll back any optimistic update, and surface the reason —
  this exact gap silently discarded profile edits for a whole release.
- **Two steps gating on different predicates is a redirect loop.** If step A
  lets you continue and step B sends you back, they must check the same thing.
  See `validateBuyer` / `buyerIsComplete`.
- **Guards that read store state must wait for hydration.** The checkout store
  restores from `sessionStorage` in a mount effect and passive effects run
  child-first, so an ungated guard sees an empty store on every hard load.

### Accessibility

Pair every message with `aria-invalid` on the input and `aria-describedby`
pointing at the message's `id`, and give the message `role="alert"`. Keep the
message *outside* `<label>` — text inside a label joins the control's
accessible name, so the field ends up announcing as "Full name Name is
required."

## Logging is part of the work, not a follow-up

**Use the module logger. Never `console.log`.**

```ts
import { createLogger } from "@/lib/logger";

const log = createLogger("checkout");
log.warn("event not found for checkout", { slug });
```

- Argument order is `(message, fields)` — the reverse of the BE's pino calls.
- One logger per module, named after it: `checkout`, `api`, `user`.
- It is level-gated and disappears in production (`prod` keeps `warn`/`error`),
  so there is no cost to logging a real failure.

### Silent failure is the thing to hunt

This app's failure mode is an empty state that looks like a normal empty state.
`.catch(() => setX(null))`, `?? []`, a fallback profile — every one of them
needs a line saying what happened:

```ts
.catch((err) => {
  log.error("could not resolve the checkout event", {
    slug,
    cause: err instanceof Error ? err.message : String(err),
  });
})
```

If you catch it, you own explaining it. An optimistic UI update that silently
fails to persist is the same problem wearing a nicer hat.

### What to log

| Situation | Level |
|---|---|
| Routine and handled (a 404 for a hidden event) | `debug` |
| Something we expected to work didn't, and we recovered | `warn` |
| Failed write, unreachable API, a state the UI can't explain | `error` |
| Per-render or per-keystroke anything | `trace`, or don't |

Log identifiers (`slug`, `status`, `requestId`) — never a whole user, order or
form body. This is a browser console: assume the user can read it.

`lib/api.ts` already logs every API failure with the BE's `x-request-id`, so
don't re-log a failed `apiFetch` at the call site — log what *your* code did
about it.

## Environment

`NEXT_PUBLIC_APP_ENV` (`local` | `dev` | `prod`) and `NEXT_PUBLIC_LOG_LEVEL`,
both documented in `.env.example`. They are inlined at build time, so a deployed
bundle carries the values of the build that produced it. An unrecognised value
falls back to the quietest behaviour on purpose — a typo must not ship debug
logs to visitors.

`lib/logger.ts` is duplicated in empireJP-Admin-FE. Port fixes to both.
