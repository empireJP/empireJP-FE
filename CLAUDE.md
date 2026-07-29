@AGENTS.md

# empireJP-FE (buyer frontend) — working notes for agents

Talks to empireJP-BE over `NEXT_PUBLIC_API_URL`. Run `npx tsc --noEmit` and
`npx eslint lib app components` before calling work done. The lint baseline is
8 pre-existing `set-state-in-effect` errors — don't add to it.

If a client-side call to the API fails with no obvious cause, check that this
app's origin is listed in the BE's `FRONTEND_ORIGINS`. A CORS rejection reaches
JS as an ordinary "Failed to fetch", and server components are unaffected, so it
looks like an empty page rather than an error.

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
