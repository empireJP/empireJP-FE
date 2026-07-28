import Link from "next/link";
import { CATEGORIES } from "@/lib/data";
import { getEvents } from "@/lib/api";
import { ARTISTS } from "@/lib/artists";
import { HeroSlider } from "@/components/HeroSlider";
import { HeroBackground } from "@/components/HeroBackground";
import { EventCard } from "@/components/EventCard";
import { EventCover } from "@/components/EventCover";
import { ArtistCard } from "@/components/ArtistCard";
import {
  ArrowRightIcon,
  FacebookIcon,
  InstagramIcon,
  WhatsappIcon,
} from "@/components/Icons";

const SOCIALS = [
  {
    name: "Facebook",
    handle: "/empireevents",
    cta: "Follow",
    href: "https://www.facebook.com/",
    Icon: FacebookIcon,
  },
  {
    name: "Instagram",
    handle: "@empireevents",
    cta: "Follow",
    href: "https://www.instagram.com/",
    Icon: InstagramIcon,
  },
  {
    name: "WhatsApp Channel",
    handle: "Empire Events",
    cta: "Join",
    href: "https://www.whatsapp.com/",
    Icon: WhatsappIcon,
  },
];

export default async function Home() {
  const [{ events }, { events: trending }] = await Promise.all([
    getEvents({ sort: "date", limit: 50 }),
    getEvents({ sort: "trending", limit: 6 }),
  ]);
  const slides = events.slice(0, 7);
  const tiles = CATEGORIES.map((c) => {
    const list = events.filter((e) => e.category === c);
    return { category: c, event: list[0], count: list.length };
  }).filter((t) => t.event);
  const featuredArtists = [...ARTISTS]
    .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)))
    .slice(0, 4);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-bg text-fg">
        <HeroBackground />
        <div className="relative z-10">
          <div className="mx-auto max-w-6xl px-4 pb-4 pt-16 sm:px-6 sm:pt-20">
            <HeroSlider events={slides} />
          </div>
        </div>
      </section>

      {/* Trending now */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-fg">Trending now</h2>
            <p className="mt-1 text-muted">The nights everyone&rsquo;s talking about.</p>
          </div>
          <Link
            href="/events"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
          >
            All events
            <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>
        <div className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>

      {/* Browse by vibe */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-fg">Browse by vibe</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <Link
              key={t.category}
              href={`/events?category=${encodeURIComponent(t.category)}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line"
            >
              <EventCover
                src={t.event!.image}
                alt=""
                accent={t.event!.accent}
                rounded="rounded-none"
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/25" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-base font-bold uppercase text-white drop-shadow sm:text-lg">
                  {t.category}
                </p>
                <p className="text-xs font-medium text-white/75">
                  {t.count} event{t.count > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Artists to follow */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-fg">Artists to follow</h2>
            <p className="mt-1 text-muted">
              Subscribe and get their new shows the moment they drop.
            </p>
          </div>
          <Link
            href="/artists"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
          >
            All artists
            <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featuredArtists.map((a) => (
            <ArtistCard key={a.slug} artist={a} />
          ))}
        </div>
      </section>

      {/* Follow us */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-fg">Follow Empire Events</h2>
          <p className="mt-1 text-muted">
            Drops, presales and lineups — first on our socials.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SOCIALS.map((s) => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-surface p-4 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.03] hover:shadow-[0_8px_30px_rgb(255_255_255_/_0.06)]"
            >
              <s.Icon
                width={24}
                height={24}
                className="shrink-0 text-gray-400 transition-colors duration-300 group-hover:text-white"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">{s.name}</p>
                <p className="truncate text-xs text-gray-400">{s.handle}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors duration-300 group-hover:bg-white/20">
                {s.cta}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
