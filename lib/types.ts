export type Category =
  | "Festival"
  | "Progressive"
  | "Melodic House"
  | "Techno"
  | "Trance"
  | "Nightlife";

export type City = "Colombo";

export interface Performer {
  name: string;
  role: string; // "Headliner" | "Speaker" | "Host" | "Performer" | "Special Guest"
}

export interface TicketTier {
  id: string;
  name: string;
  /** What the buyer pays per ticket. Nothing is added on top at checkout —
   *  the platform's commission is charged to the organizer at settlement. */
  price: number;
  blurb: string;
  perks?: string[];
  available: number;
  badge?: "Popular" | "Best Value" | "Limited" | "Final Release";
  soldOut?: boolean;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: Category;
  city: City;
  area: string;
  venue: string;
  date: string; // ISO start
  startTime: string; // "19:00"
  endTime: string; // "23:00"
  ageLimit: number; // 0 = all ages
  organizer: { name: string; verified?: boolean };
  lineupLabel: string; // "Lineup" | "Speakers" | "Performers"
  lineup: Performer[];
  description: string[];
  /** ISO code every tier price is denominated in ("USD", "JPY", …).
   *  Format money with it (lib/format money/amount) — never a hardcoded "$".
   *  Optional only because the legacy mock data in lib/data.ts predates it;
   *  the API always sends it, and formatting falls back to USD. */
  currency?: string;
  tiers: TicketTier[];
  image: string; // cover image path under /public
  trailerUrl?: string; // mp4/webm URL, or a YouTube/Vimeo link
  accent: string; // dominant color for small solid accents
  attending: number;
  capacity: number;
  /** The show is over. Server-computed and absent (not `false`) while it is
   *  still to come.
   *
   *  Don't re-derive this from `date`/`startTime`/`endTime`: those are Colombo
   *  wall-clock strings, and `endTime <= startTime` means the night runs past
   *  midnight — two ways to get "is it over" wrong in a browser, on the
   *  question that gates the buy button. */
  ended?: true;
  /** Tickets can no longer be bought. Usually arrives with `ended`, but a
   *  business can close sales early (advance-only) or late (a grace window),
   *  so an event can be sales-closed while still running. */
  salesClosed?: true;
  featured?: boolean;
}

export interface CartLine {
  tierId: string;
  qty: number;
}

export interface Order {
  code: string;
  /** Server-owned lifecycle. PENDING until the gateway's callback lands, so
   *  the confirmation page polls on it rather than assuming success. Tickets
   *  are `[]` for anything but PAID. */
  status?: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  /** ISO code every amount on this order is denominated in. Optional because
   *  orders persisted in browser storage predate it; falls back to USD. */
  currency?: string;
  eventSlug: string;
  eventTitle: string;
  lines: { tierName: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  /** `subtotal - discount`. No service fee is added to the buyer's total —
   *  the platform commission is deducted from the organizer at settlement. */
  total: number;
  buyerName: string;
  buyerEmail: string;
  tickets: { code: string; tierName: string; holder: string }[];
}

/** Gateway ids the API accepts on POST /orders. Which of them an event's
 *  checkout actually offers depends on its currency — the API's
 *  /payments/methods?currency= is the authority. `komoju` is the JPY lane
 *  (JCB, konbini, PayPay); `mock` completes instantly without charging
 *  anything and is only offered on non-production servers. */
export type PaymentProviderId = "payhere" | "komoju" | "mock";

/** One row of GET /payments/methods — what THIS server can actually run.
 *  Rendering the payment step from this rather than a hardcoded list is what
 *  stops a build with no PayHere credentials offering "Pay with card" and
 *  failing at the last possible moment. */
export interface PaymentMethod {
  id: PaymentProviderId;
  label: string;
  blurb: string;
  /** True for methods that never move money — the UI must say so. */
  demo: boolean;
}

/** How the browser launches a hosted gateway, handed over verbatim by the API
 *  on POST /orders. `fields` is already signed: pass it through untouched, as
 *  the hash covers these exact values. Nothing here is secret — the hash is a
 *  digest derived from the merchant secret and is bound to this one order. */
export interface PaymentInstruction {
  kind: "popup" | "redirect";
  sdkUrl?: string;
  actionUrl: string;
  fields: Record<string, string>;
  /** Pointed at the gateway's test estate — surfaced to the buyer. */
  sandbox: boolean;
}

/** POST /orders response: the order, plus what to do next to pay for it. */
export interface CreatedOrder extends Order {
  paymentProvider: PaymentProviderId;
  /** Absent for providers with no buyer-facing step (mock). */
  payment?: PaymentInstruction;
}
