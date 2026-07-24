import { EVENTS, upcomingEvents } from "./data";
import type { EventItem } from "./types";

export interface PastShow {
  title: string;
  venue: string;
  date: string;
}

export interface Artist {
  slug: string;
  name: string;
  verified: boolean;
  role: string; // genre / billing
  city: string;
  followers: string; // display string, e.g. "24.1k"
  bio: string;
  accent: string;
  photo?: string; // cover photo under /public; falls back to initials
  match: string; // normalized token used to find their events
  socials: { instagram?: string; soundcloud?: string; spotify?: string };
  pastShows: PastShow[];
}

export const ARTISTS: Artist[] = [
  {
    slug: "hernan-cattaneo",
    name: "Hernán Cattáneo",
    verified: true,
    role: "Progressive House",
    city: "Buenos Aires",
    followers: "312k",
    bio: "The Argentine maestro who defined modern progressive. Three decades of marathon sets, a GRAMMY nomination, and his own Sudbeat label.",
    accent: "#12a06a",
    match: "cattaneo",
    socials: { instagram: "hernancattaneo", soundcloud: "hernancattaneo", spotify: "hernancattaneo" },
    pastShows: [
      { title: "Sunsetstrip", venue: "Ushuaïa, Ibiza", date: "2026-06-13" },
      { title: "Sudbeat 15 Years", venue: "Warehouse, London", date: "2026-05-02" },
    ],
  },
  {
    slug: "danny-howells",
    name: "Danny Howells",
    verified: true,
    role: "Deep & Progressive",
    city: "London",
    followers: "128k",
    bio: "A pioneer of deep, sexy, dubby house. Known for genre-hopping sets that go anywhere and everywhere across a long night.",
    accent: "#2f7dff",
    match: "danny howells",
    socials: { instagram: "dannyhowells", soundcloud: "dannyhowells" },
    pastShows: [
      { title: "Dig Deeper", venue: "Output, NYC", date: "2026-04-19" },
    ],
  },
  {
    slug: "kamilo-sanclemente",
    name: "Kamilo Sanclemente",
    verified: true,
    role: "Progressive House",
    city: "Medellín",
    followers: "86k",
    bio: "Colombia's most exported progressive talent — deep, emotive and melodic, with releases on the scene's biggest labels.",
    accent: "#eab308",
    match: "kamilo",
    socials: { instagram: "kamilosanclemente", spotify: "kamilosanclemente" },
    pastShows: [
      { title: "Dreamstate", venue: "Medellín", date: "2026-03-28" },
    ],
  },
  {
    slug: "simon-vuarambon",
    name: "Simon Vuarambon",
    verified: true,
    role: "Progressive",
    city: "Geneva",
    followers: "41k",
    bio: "Swiss selector known for hypnotic, long-form journeys. A regular across Europe's most respected underground rooms.",
    accent: "#2f7dff",
    match: "simon vuarambon",
    socials: { instagram: "simonvuarambon", soundcloud: "simonvuarambon" },
    pastShows: [{ title: "Odeysse Genève", venue: "Audio Club", date: "2026-05-24" }],
  },
  {
    slug: "kyotto",
    name: "KYOTTO",
    verified: true,
    role: "Melodic House & Techno",
    city: "Colombo",
    followers: "58k",
    bio: "South Asia's breakout melodic act, famed for cinematic open-to-close sets that build all night into the morning.",
    accent: "#f97316",
    match: "kyotto",
    socials: { instagram: "kyottomusic", soundcloud: "kyotto", spotify: "kyotto" },
    pastShows: [{ title: "Members Only", venue: "The Steuart, Colombo", date: "2026-02-14" }],
  },
  {
    slug: "ultra",
    name: "Ultra",
    verified: true,
    role: "Techno",
    city: "Colombo",
    followers: "34k",
    bio: "One half of the city's most in-demand b2b, and a headline force in his own right. Relentless, hypnotic, peak-time techno.",
    accent: "#3694ff",
    photo: "/artists/ultra.jpg",
    match: "ultra",
    socials: { instagram: "ultra.lk", soundcloud: "ultra-lk" },
    pastShows: [{ title: "Warehouse 07", venue: "Port City, Colombo", date: "2026-04-05" }],
  },
  {
    slug: "vegaz",
    name: "Vegaz SL",
    verified: true,
    role: "Techno & Melodic",
    city: "Colombo",
    followers: "29k",
    bio: "A cornerstone of the Sri Lankan techno scene — driving, melodic and made for the peak of the night. A Dusty World regular.",
    accent: "#f2c200",
    photo: "/artists/vegaz.jpg",
    match: "vegaz",
    socials: { instagram: "vegaz.sl", soundcloud: "vegazsl" },
    pastShows: [{ title: "Dusty World", venue: "Port City, Colombo", date: "2026-04-05" }],
  },
  {
    slug: "noiyse-project",
    name: "Noiyse Project",
    verified: true,
    role: "Progressive & Melodic Techno",
    city: "Colombo",
    followers: "26k",
    bio: "Emotive progressive and melodic techno with an ear for the long build. One of the island's most exciting live prospects.",
    accent: "#8b5cf6",
    photo: "/artists/noiyse-project.jpg",
    match: "noiyse project",
    socials: { instagram: "noiyseproject", soundcloud: "noiyseproject", spotify: "noiyseproject" },
    pastShows: [{ title: "Rebirth of Dusty World", venue: "Lotus Tower, Colombo", date: "2026-05-16" }],
  },
  {
    slug: "ayanth",
    name: "Ayanth",
    verified: false,
    role: "House & Techno",
    city: "Colombo",
    followers: "14k",
    bio: "A rising selector moving effortlessly between house and techno, and a name to watch across Colombo's warehouse circuit.",
    accent: "#2dd4bf",
    photo: "/artists/ayanth.jpg",
    match: "ayanth",
    socials: { instagram: "ayanth.music", soundcloud: "ayanth" },
    pastShows: [{ title: "Warehouse Sessions", venue: "Colombo", date: "2026-03-22" }],
  },
  {
    slug: "a-jay",
    name: "A-Jay",
    verified: false,
    role: "House & Techno",
    city: "Colombo",
    followers: "22k",
    bio: "Versatile selector moving between deep house and driving techno, and one of the scene's most reliable b2b partners.",
    accent: "#8b5cf6",
    match: "a-jay",
    socials: { instagram: "ajay.music", soundcloud: "ajay-music" },
    pastShows: [{ title: "Sunset Sessions", venue: "Lotus Tower, Colombo", date: "2026-03-15" }],
  },
  {
    slug: "enzo-vood",
    name: "Enzo Vood",
    verified: false,
    role: "Melodic Techno",
    city: "Colombo",
    followers: "19k",
    bio: "Melodic techno producer with a taste for the long, unbroken all-night set. A rising name on the Dusty World roster.",
    accent: "#f2c200",
    match: "enzo vood",
    socials: { instagram: "enzovood", soundcloud: "enzovood" },
    pastShows: [{ title: "All Night Long", venue: "Port City, Colombo", date: "2026-02-28" }],
  },
  {
    slug: "dimuth-k",
    name: "Dimuth K",
    verified: true,
    role: "Progressive House",
    city: "Colombo",
    followers: "47k",
    bio: "Sri Lanka's most internationally recognised progressive export, with releases and remixes on labels worldwide.",
    accent: "#12a06a",
    match: "dimuth k",
    socials: { instagram: "dimuthkmusic", soundcloud: "dimuthk", spotify: "dimuthk" },
    pastShows: [{ title: "Melodic Distraction", venue: "Liverpool", date: "2026-04-11" }],
  },
];

const norm = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function getArtist(slug: string): Artist | undefined {
  return ARTISTS.find((a) => a.slug === slug);
}

/** Upcoming events this artist appears on. */
export function artistEvents(artist: Artist): EventItem[] {
  const m = norm(artist.match);
  return upcomingEvents().filter((e) =>
    e.lineup.some((p) => norm(p.name).includes(m))
  );
}

/** Total (all-time) event count for a headline stat. */
export function artistEventCount(artist: Artist): number {
  const m = norm(artist.match);
  return EVENTS.filter((e) => e.lineup.some((p) => norm(p.name).includes(m))).length;
}

/** Artists that appear on a given event (to link lineups to profiles). */
export function artistsOnEvent(event: EventItem): Record<string, Artist> {
  const map: Record<string, Artist> = {};
  for (const p of event.lineup) {
    const n = norm(p.name);
    const artist = ARTISTS.find((a) => n.includes(norm(a.match)));
    if (artist) map[p.name] = artist;
  }
  return map;
}
