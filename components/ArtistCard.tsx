import Link from "next/link";
import type { Artist } from "@/lib/artists";
import { artistEvents } from "@/lib/artists";
import { SubscribeButton } from "./SubscribeButton";
import { CheckCircleIcon } from "./Icons";
import { initials } from "@/lib/format";

export function ArtistCard({ artist }: { artist: Artist }) {
  const upcoming = artistEvents(artist).length;

  return (
    <article className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[var(--shadow-card)]">
      {/* artwork */}
      {artist.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artist.photo}
          alt={artist.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="font-display text-7xl font-bold"
            style={{ color: artist.accent, opacity: 0.22 }}
          >
            {initials(artist.name)}
          </span>
        </div>
      )}

      {/* black fade for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

      {/* whole-card navigation */}
      <Link
        href={`/artists/${artist.slug}`}
        aria-label={artist.name}
        className="absolute inset-0 z-10"
      />

      {/* info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4">
        <div className="flex items-start gap-1">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-white">
            {artist.name}
          </h3>
          {artist.verified && (
            <CheckCircleIcon width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
          )}
        </div>
        <p className="truncate text-xs font-medium text-white/70">{artist.role}</p>
        <p className="mt-0.5 text-[11px] text-white/50">
          {artist.followers} followers · {upcoming} upcoming
        </p>
        <div className="pointer-events-auto mt-3">
          <SubscribeButton slug={artist.slug} onImage />
        </div>
      </div>
    </article>
  );
}
