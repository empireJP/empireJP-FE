import { EVENTS } from "./data";
import type { EventItem } from "./types";

/** The subset of events this demo organizer "owns". */
export const MY_EVENTS: EventItem[] = EVENTS.slice(0, 4);

function avgPrice(e: EventItem) {
  const paid = e.tiers.filter((t) => t.price > 0);
  if (paid.length === 0) return 0;
  return paid.reduce((s, t) => s + t.price, 0) / paid.length;
}

/** Rough gross revenue estimate for a managed event. */
export function eventRevenue(e: EventItem) {
  return Math.round((e.attending * avgPrice(e) * 0.7) / 10) * 10;
}

export function kpis() {
  const revenue = MY_EVENTS.reduce((s, e) => s + eventRevenue(e), 0);
  const sold = MY_EVENTS.reduce((s, e) => s + e.attending, 0);
  const capacity = MY_EVENTS.reduce((s, e) => s + e.capacity, 0);
  const fill = Math.round((sold / capacity) * 100);
  const checkedIn = Math.round(sold * 0.0); // events upcoming → no check-ins yet
  return { revenue, sold, capacity, fill, live: MY_EVENTS.length, checkedIn };
}

/** 8-week gross-revenue trend for the overview sparkline. */
export const REVENUE_SERIES = [4200, 5100, 4800, 6300, 7100, 6600, 8200, 9400];

export type AttendeeStatus = "Confirmed" | "Checked in" | "Refunded";

export interface Attendee {
  id: string;
  name: string;
  email: string;
  eventSlug: string;
  eventTitle: string;
  tier: string;
  qty: number;
  purchased: string; // ISO date
  amount: number;
  status: AttendeeStatus;
  repeat?: boolean;
}

export const ATTENDEES: Attendee[] = [
  { id: "a1", name: "Emma Carter", email: "emma.carter@gmail.com", eventSlug: "sudbeat-showcase-colombo", eventTitle: "Sudbeat Showcase", tier: "VIP Entry", qty: 2, purchased: "2026-07-14", amount: 320, status: "Confirmed", repeat: true },
  { id: "a2", name: "Liam Nguyen", email: "liam.ng@outlook.com", eventSlug: "sudbeat-showcase-colombo", eventTitle: "Sudbeat Showcase", tier: "Final Phase", qty: 1, purchased: "2026-07-13", amount: 65, status: "Confirmed" },
  { id: "a3", name: "Sofia Rossi", email: "sofia.rossi@icloud.com", eventSlug: "odeysse-simon-vuarambon", eventTitle: "Odeysse: Simon Vuarambon", tier: "Final Phase", qty: 2, purchased: "2026-07-12", amount: 90, status: "Confirmed" },
  { id: "a4", name: "Noah Williams", email: "noah.w@gmail.com", eventSlug: "odeysse-simon-vuarambon", eventTitle: "Odeysse: Simon Vuarambon", tier: "VVIP Table", qty: 1, purchased: "2026-07-11", amount: 250, status: "Confirmed", repeat: true },
  { id: "a5", name: "Ava Martinez", email: "ava.m@proton.me", eventSlug: "kyotto-open-to-close", eventTitle: "KYOTTO: Open to Close", tier: "Standard", qty: 2, purchased: "2026-07-11", amount: 160, status: "Confirmed" },
  { id: "a6", name: "Oliver Smith", email: "oli.smith@gmail.com", eventSlug: "rebirth-of-dusty-world", eventTitle: "Rebirth of Dusty World", tier: "VIP", qty: 2, purchased: "2026-07-10", amount: 280, status: "Confirmed" },
  { id: "a7", name: "Mia Johnson", email: "mia.j@gmail.com", eventSlug: "rebirth-of-dusty-world", eventTitle: "Rebirth of Dusty World", tier: "Pre-Sale", qty: 3, purchased: "2026-07-10", amount: 120, status: "Confirmed" },
  { id: "a8", name: "Ethan Brown", email: "ethan.b@icloud.com", eventSlug: "sudbeat-showcase-colombo", eventTitle: "Sudbeat Showcase", tier: "Final Phase", qty: 1, purchased: "2026-07-09", amount: 65, status: "Refunded" },
  { id: "a9", name: "Isabella Kim", email: "bella.kim@gmail.com", eventSlug: "kyotto-open-to-close", eventTitle: "KYOTTO: Open to Close", tier: "Early Access", qty: 2, purchased: "2026-07-09", amount: 120, status: "Confirmed", repeat: true },
  { id: "a10", name: "James Lee", email: "james.lee@outlook.com", eventSlug: "odeysse-simon-vuarambon", eventTitle: "Odeysse: Simon Vuarambon", tier: "Final Phase", qty: 2, purchased: "2026-07-08", amount: 90, status: "Confirmed" },
  { id: "a11", name: "Charlotte Davis", email: "charlie.d@gmail.com", eventSlug: "rebirth-of-dusty-world", eventTitle: "Rebirth of Dusty World", tier: "Final Phase", qty: 2, purchased: "2026-07-08", amount: 110, status: "Confirmed" },
  { id: "a12", name: "Benjamin Wilson", email: "ben.wilson@gmail.com", eventSlug: "kyotto-open-to-close", eventTitle: "KYOTTO: Open to Close", tier: "Members Table", qty: 1, purchased: "2026-07-07", amount: 320, status: "Confirmed", repeat: true },
  { id: "a13", name: "Amelia Garcia", email: "amelia.g@icloud.com", eventSlug: "sudbeat-showcase-colombo", eventTitle: "Sudbeat Showcase", tier: "Final Phase", qty: 2, purchased: "2026-07-07", amount: 130, status: "Confirmed" },
  { id: "a14", name: "Lucas Moore", email: "lucas.moore@gmail.com", eventSlug: "rebirth-of-dusty-world", eventTitle: "Rebirth of Dusty World", tier: "Pre-Sale", qty: 2, purchased: "2026-07-06", amount: 80, status: "Confirmed" },
];

export function audienceStats() {
  const total = ATTENDEES.filter((a) => a.status !== "Refunded").length;
  const tickets = ATTENDEES.filter((a) => a.status !== "Refunded").reduce((s, a) => s + a.qty, 0);
  const repeat = ATTENDEES.filter((a) => a.repeat).length;
  const newThisWeek = ATTENDEES.filter((a) => a.purchased >= "2026-07-09").length;
  return { total, tickets, repeat, newThisWeek };
}
