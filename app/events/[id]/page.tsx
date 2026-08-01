import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEvent } from "@/lib/api";
import { artistsOnEvent } from "@/lib/artists";
import { EventCover } from "@/components/EventCover";
import { GetTicketsButton } from "@/components/GetTicketsButton";
import { TrailerButton } from "@/components/TrailerButton";
import { VenueMap } from "@/components/VenueMap";
import { fromPrice } from "@/components/EventCard";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  PinIcon,
  ShareIcon,
  TicketIcon,
} from "@/components/Icons";
import { calendarParts, dateLong, money, to12h } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const e = await getEvent(id);
  if (!e) return { title: "Event not found — Empire Events" };
  return { title: `${e.title} · ${e.venue} — Empire Events`, description: e.tagline };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const cal = calendarParts(event.date);
  const from = fromPrice(event);
  const soldOut = from === null;
  const artistMap = artistsOnEvent(event);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeftIcon width={15} height={15} />
        Explore events
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Left */}
        <aside className="md:sticky md:top-24 md:self-start">
          <EventCover
            src={event.image}
            alt={event.title}
            accent={event.accent}
            className="aspect-[4/5] w-full shadow-[var(--shadow-card)]"
            rounded="rounded-3xl"
            priority
          />

          <TrailerButton url={event.trailerUrl} title={event.title} />

          <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
              {event.lineupLabel}
            </h3>
            <div className="mt-3 flex flex-col gap-2.5">
              {event.lineup.map((a) => {
                const artist = artistMap[a.name];
                return (
                  <div key={a.name} className="flex items-center justify-between gap-3">
                    {artist ? (
                      <Link
                        href={`/artists/${artist.slug}`}
                        className="group flex min-w-0 items-center gap-1 font-medium text-fg"
                      >
                        <span className="truncate group-hover:underline">{a.name}</span>
                        {artist.verified && (
                          <CheckCircleIcon width={14} height={14} className="shrink-0 text-accent" />
                        )}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate font-medium text-fg">{a.name}</span>
                    )}
                    <span className="shrink-0 text-xs font-medium text-faint">{a.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
              Organized by
            </h3>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="font-semibold text-fg">{event.organizer.name}</span>
              {event.organizer.verified && (
                <CheckCircleIcon width={16} height={16} className="text-accent" />
              )}
            </div>
          </div>

          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg">
            <ShareIcon width={16} height={16} /> Share
          </button>
        </aside>

        {/* Right */}
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              {event.category}
            </span>
            <span className="text-xs text-faint">
              {event.ageLimit === 0 ? "All ages" : `${event.ageLimit}+`}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">
            {event.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{event.tagline}</p>

          {/* meta */}
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface">
                <div className="flex h-full w-full flex-col">
                  <span className="bg-surface-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-accent">
                    {cal.month}
                  </span>
                  <span className="flex flex-1 items-center justify-center text-lg font-bold leading-none text-fg">
                    {cal.day}
                  </span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-fg">{dateLong(event.date)}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <ClockIcon width={14} height={14} className="text-faint" />
                  {to12h(event.startTime)} – {to12h(event.endTime)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted">
                <PinIcon width={22} height={22} />
              </div>
              <div>
                <p className="font-semibold text-fg">{event.venue}</p>
                <p className="text-sm text-muted">{event.area}, {event.city}</p>
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <TicketIcon width={16} height={16} className="text-muted" /> Tickets
              </span>
              <span className="text-sm text-muted">
                {soldOut ? "Sold out" : from === 0 ? "Free" : `from ${money(from!)}`}
              </span>
            </div>

            <div className="divide-y divide-line">
              {event.tiers.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-fg">{t.name}</span>
                      {t.badge && !t.soldOut && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{t.blurb}</p>
                    {t.perks && (
                      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        {t.perks.map((p) => (
                          <li key={p} className="flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-accent" /> {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-fg">{t.soldOut ? "—" : money(t.price)}</p>
                    <p className={`text-xs ${!t.soldOut && t.available <= 24 ? "text-warning" : "text-faint"}`}>
                      {t.soldOut ? "Sold out" : t.available <= 24 ? `${t.available} left` : "Available"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-line p-4">
              <GetTicketsButton slug={event.slug} soldOut={soldOut} />
              <p className="mt-2 text-center text-xs text-faint">
                Secure checkout · Mobile QR ticket · Instant confirmation
              </p>
            </div>
          </div>

          {/* About */}
          <section className="mt-8 border-t border-line pt-7">
            <h2 className="text-lg font-semibold text-fg">About this event</h2>
            <div className="mt-3 flex flex-col gap-3 leading-relaxed text-muted">
              {event.description.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {/* Details */}
          <section className="mt-8 border-t border-line pt-7">
            <h2 className="text-lg font-semibold text-fg">Good to know</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {[
                ["Starts", to12h(event.startTime)],
                ["Ends", to12h(event.endTime)],
                ["Age", event.ageLimit === 0 ? "All ages" : `${event.ageLimit}+`],
                ["Category", event.category],
                ["Organizer", event.organizer.name],
                ["City", event.city],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-faint">{k}</dt>
                  <dd className="mt-0.5 font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Location */}
          <section className="mt-8 border-t border-line pt-7">
            <h2 className="text-lg font-semibold text-fg">Location</h2>
            <p className="mt-2 font-medium text-fg">{event.venue}</p>
            <p className="text-sm text-muted">{event.area}, {event.city}</p>
            <VenueMap venue={event.venue} area={event.area} city={event.city} />
          </section>
        </div>
      </div>
    </div>
  );
}
