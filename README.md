# Ovation

A premium, buyer-first event **ticketing & management** platform — discover events
and buy a ticket end-to-end, while organizers sell and manage their audience in a
separate area. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**,
**Tailwind CSS v4**, with a design language inspired by **HeroUI** (blue primary,
purple secondary, rounded, soft-shadowed, first-class dark mode). Frontend only —
data is mocked; no real backend or payments.

## Getting started

```bash
npm install     # if node_modules isn't present
npm run dev     # http://localhost:3000
npm run build   # production build
```

## The buyer journey (fully clickable)

**Explore → Event detail → Select tickets → Sign in → Details → Payment → Confirmation (QR)**

| Route | Step |
| --- | --- |
| `/` | Discover — hero, featured spotlight, category + city filters, search |
| `/events/[slug]` | Event detail — lineup, tiers, "Good to know", map, **Get Tickets** |
| `/checkout/tickets` | Pick ticket tiers & quantities (live order summary) |
| `/checkout/signin` | Guest sign-in — Google / Apple / email |
| `/checkout/details` | Attendee details |
| `/checkout/payment` | Card or Apple Pay (mocked), with a processing state |
| `/checkout/confirmation` | "You're going!" + real scannable **QR tickets**, add-to-calendar |

Checkout state is held in a persisted React context ([`lib/checkout.tsx`](lib/checkout.tsx))
that survives refresh via `sessionStorage`, so the funnel is resilient at every step.
QR codes are generated client-side with `qrcode.react`.

## The organizer area (secondary)

Kept deliberately out of the main buyer flow — reached via **For Organizers**.

| Route | Purpose |
| --- | --- |
| `/organizers` | Marketing / pricing, with a clear path into the dashboard |
| `/dashboard` | Overview — revenue, tickets sold, fill rate, revenue trend, your events |
| `/dashboard/audience` | Audience CRM — segment, search & filter attendees, check-in |

## Design system

Tokens live in [`app/globals.css`](app/globals.css) and are exposed to Tailwind via
`@theme`. Theming swaps the underlying variables, so one set of utilities serves
both light and dark.

- **HeroUI-style palette** — primary `#006FEE`, secondary `#7828C8`, semantic
  success / warning / danger; zinc-based near-black dark mode.
- **Type** — Inter (via `next/font`), tight tracking, tabular figures for numerics.
- **Shape** — rounded cards, pill controls, soft layered shadows.
- **Real poster covers** — each event uses an actual event poster
  ([`public/event-covers`](public/event-covers)) rendered 4:5 with `object-cover`
  ([`components/EventCover.tsx`](components/EventCover.tsx)); avatars are
  initials-based. No decorative gradients.
- Light/dark toggle persists to `localStorage`; a no-flash inline script applies the
  theme before paint.

## Structure

```
app/
  layout.tsx                 fonts, theme script, nav/footer, CheckoutProvider
  page.tsx                   Discover
  events/[id]/page.tsx       Event detail (SSG per event)
  checkout/*/page.tsx        the 5-step funnel
  organizers/page.tsx        organizer marketing
  dashboard/(layout,page)    overview + audience CRM
  signin/page.tsx            standalone account sign-in
components/                  TopNav, EventCard, CheckoutShell, OrderSummary,
                             QtyStepper, CheckoutStepper, QRTicket, DashboardTabs, 
lib/
  data.ts                    9 electronic-music events, each with a poster cover
  dashboard.ts               organizer KPIs + audience records
  checkout.tsx               persisted funnel store
  types.ts  format.ts  steps.ts
```

> Not a real company. Events, lineups, people and prices are fictional.
