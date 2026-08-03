# SEO — empireJP-FE

What this app emits for search engines and social crawlers, why each piece is
shaped the way it is, and what is deliberately still missing.

Everything absolute is built from `NEXT_PUBLIC_SITE_URL` (`lib/site.ts`). Set it
per environment — it is inlined at build time, so a preview build carrying the
production value emits canonicals pointing at production and asks Google to
drop the preview's own pages.

## What's in place

| Surface | Where |
|---|---|
| `metadataBase`, title template, default OG/Twitter, `max-image-preview:large` | `app/layout.tsx` |
| Canonical URL per page | each page's `alternates.canonical` |
| `robots.txt` | `app/robots.ts` |
| `sitemap.xml` (static routes + artists + every event, hourly) | `app/sitemap.ts` |
| `Organization` + `WebSite` (with `SearchAction`) JSON-LD | `app/layout.tsx` |
| `Event` + `BreadcrumbList` JSON-LD | `app/events/[id]/page.tsx` |
| `noindex` on checkout, account, dashboard | layouts in each |

### Titles

The root layout sets a template, so a page supplies `title: "Explore events"`
and gets `Explore events — Empire Events`. **Don't put the brand in a page
title** — it double-suffixes. Every page title was de-suffixed when the
template landed.

### robots.txt and noindex do different jobs

Both are configured, on purpose:

- `robots.txt` blocks *crawling*. A crawler that never fetches the page also
  never sees a `noindex`, so this alone cannot remove a URL someone links to.
- `noindex` blocks *indexing*, but only if the page is fetched.

Neither is a privacy control — `robots.txt` is public and advisory. Anything
genuinely private is protected by the session check on the route.

### Structured data

The `Event` node is the highest-value item here: it is what earns the date,
venue and "from ¥X" row under a result instead of a plain blue link.

Two rules `lib/structured-data.ts` exists to keep:

1. **Only mark up what the page shows.** Every field comes from the same
   `EventItem` the page renders. Marking up a price or date the user can't see
   is a manual-action risk.
2. **Emit nothing rather than something wrong.** An absent field costs a
   rich-result feature; a wrong one gets published as fact.

Two details worth knowing before editing it:

- **Dates are naive on purpose.** `EventItem.date` is `2026-08-15T20:00:00` —
  no `Z`, no offset — because the BE serializes wall-clock verbatim. ISO 8601
  without an offset means "local time at the venue", which is exactly what a
  door time is. Never run it through `new Date()` or append `Z`: that
  reinterprets a 20:00 Tokyo doors as 20:00 UTC.
- **`endTime <= startTime` means the show crosses midnight**, so the end date is
  the following day. Same rule the BE uses to compute `ended`. Get it wrong and
  the event finishes before it starts, which rich results reject outright.

## Known gaps — deliberate, with reasons

**`addressCountry` is absent from `Event.location`.** `City` is a free-form
string (`lib/types.ts`) and the live catalog currently spans Colombo as well as
Japan, so there is nothing to derive a country from. Asserting one would
publish a false location on every event outside it. Add it when the API sends a
country field — not before.

> Related: the site declares `en-JP` while much of the current event data is Sri
> Lankan. That's a content/targeting question rather than a code one, but if the
> catalog is really Sri Lanka-first, `SITE_LOCALE` in `lib/site.ts` is the one
> line to change.

**Event pages are fully dynamic.** `lib/api.ts` uses `cache: "no-store"`
everywhere, so every event page is server-rendered per request. ISR would cut
TTFB (a ranking input) meaningfully — but it would also let ticket availability
and the sold-out state go stale, and those gate the buy button. That is a
product decision, not an SEO one, so it was left alone. If it's wanted, the
narrow version is a short `revalidate` on the event page only, accepting that
`soldOut` can lag by that window.

The sitemap *is* cached (1h) via an opt-in `revalidate` argument on
`getEvents` — a list of URLs going an hour stale is harmless, and re-walking the
whole catalog on every crawler hit is not.

**Covers render through a raw `<img>`, not `next/image`.** That leaves
width/height, `srcset` and modern formats on the table — all of which feed LCP
and CLS. Worth doing, but it touches every card and cover component and belongs
in its own change.

**No per-event generated OG image.** Events currently share their cover art as
the OG image, which for a poster-led catalog is arguably better than a generated
text card. A `next/og` route could add title/date/venue overlays later.

**No `manifest.ts`.** PWA territory rather than SEO; skipped to keep this
focused.

**No `hreflang`.** Single locale today. If Japanese lands, add `alternates.
languages` in the root layout and per page — the metadata is already
structured so that slots in without rework.

## Verifying a change

`npx next build` catches more here than typecheck does — it actually renders
`robots.ts` and `sitemap.ts`. It is how the sitemap's page-size bug was found:
the **public** catalog caps `limit` at 50 (the dashboard endpoints allow 100),
so asking for 100 returned a 400 and silently produced a sitemap with zero
events.

After building, `npx next start` and check the real output:

```
curl -s localhost:3000/robots.txt
curl -s localhost:3000/sitemap.xml | grep -c "<loc>"
curl -s "localhost:3000/events/<slug>" | grep -o '<link rel="canonical"[^>]*>'
```

Paste an event page into Google's Rich Results Test before shipping structured
data changes — it catches shape errors that no local check will.
