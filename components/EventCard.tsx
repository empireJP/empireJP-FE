import Link from "next/link";
import type { EventItem } from "@/lib/types";
import { EventCover } from "./EventCover";
import { SaveButton } from "./SaveButton";
import { CalendarIcon, PinIcon } from "./Icons";
import { dateShort, money, to12h } from "@/lib/format";

/**
 * Where an event card points.
 *
 * A private event is only addressable by its share token — `/events/<slug>`
 * 404s for one by design. `shareToken` reaches the FE on exactly one payload
 * (`GET /me/saved-events`), so in practice this is the Saved tab; everywhere
 * else the token is absent and the slug is correct.
 */
export function eventHref(e: EventItem): string {
  return e.shareToken ? `/e/${e.shareToken}` : `/events/${e.slug}`;
}

export function fromPrice(e: EventItem) {
  const live = e.tiers.filter((t) => !t.soldOut);
  if (live.length === 0) return null;
  return Math.min(...live.map((t) => t.price));
}

function priceLabel(event: EventItem, from: number | null) {
  // A price on a finished event is noise — nobody can act on it, and
  // "from $45" beside a show that happened last month reads like it is still
  // for sale. The corner badge is the same slot either way.
  if (event.ended) return "Ended";
  if (event.salesClosed) return "Sales closed";
  if (from === null) return "Sold out";
  if (from === 0) return "Free";
  return `from ${money(from, event.currency)}`;
}

export function EventCard({ event }: { event: EventItem }) {
  const from = fromPrice(event);
  const top = event.lineup[0];
  const nearlyFull = event.attending / event.capacity >= 0.9;
  const over = Boolean(event.ended);

  return (
    <Link
      // A private event has no slug URL — the API 404s one on purpose. The
      // only card that can carry a token is a saved one, and only for a user
      // who already held the link.
      href={eventHref(event)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-pop)]"
    >
      <div className="relative aspect-[4/5]">
        <EventCover
          src={event.image}
          alt={event.title}
          accent={event.accent}
          // Desaturated and dimmed rather than hidden: the card stays
          // recognisable in a saved list or a search result, while reading as
          // past at a glance instead of competing with what's still on sale.
          className={`absolute inset-0 ${over ? "opacity-45 grayscale" : ""}`}
          rounded="rounded-none"
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {event.category}
        </span>
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
            over ? "bg-black/60 text-white/90" : "bg-white/90 text-neutral-900"
          }`}
        >
          {priceLabel(event, from)}
        </span>
        <SaveButton id={event.id} slug={event.slug} className="absolute bottom-3 right-3" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-accent">
          <CalendarIcon width={15} height={15} />
          {dateShort(event.date)} · {to12h(event.startTime)}
        </div>

        <h3 className="text-lg font-semibold leading-snug tracking-tight text-fg">
          {event.title}
        </h3>

        {top && (
          <p className="truncate text-sm text-muted">
            <span className="text-faint">{top.role} · </span>
            <span className="font-medium text-fg">{top.name}</span>
          </p>
        )}

        <div className="flex items-center gap-1.5 text-sm text-muted">
          <PinIcon width={15} height={15} className="shrink-0" />
          <span className="truncate">
            {event.venue} · {event.city}
          </span>
        </div>

        {nearlyFull && from !== null && (
          <div className="mt-auto pt-2">
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
              Almost full
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
