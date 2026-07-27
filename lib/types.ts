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
  price: number; // USD, excl. fee
  fee: number; // per-ticket service fee
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
  tiers: TicketTier[];
  image: string; // cover image path under /public
  trailerUrl?: string; // mp4/webm URL, or a YouTube/Vimeo link
  accent: string; // dominant color for small solid accents
  attending: number;
  capacity: number;
  featured?: boolean;
}

export interface CartLine {
  tierId: string;
  qty: number;
}

export interface Order {
  code: string;
  eventSlug: string;
  eventTitle: string;
  lines: { tierName: string; qty: number; price: number }[];
  subtotal: number;
  fees: number;
  discount: number;
  couponCode?: string;
  total: number;
  buyerName: string;
  buyerEmail: string;
  tickets: { code: string; tierName: string; holder: string }[];
}
