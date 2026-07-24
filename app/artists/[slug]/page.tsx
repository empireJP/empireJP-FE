import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ARTISTS, artistEvents, getArtist } from "@/lib/artists";
import { EventCard } from "@/components/EventCard";
import { Avatar } from "@/components/Avatar";
import { SubscribeButton } from "@/components/SubscribeButton";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckCircleIcon,
  InstagramIcon,
  PinIcon,
  SoundcloudIcon,
  SpotifyIcon,
} from "@/components/Icons";
import { dateShort } from "@/lib/format";

export function generateStaticParams() {
  return ARTISTS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = getArtist(slug);
  if (!a) return { title: "Artist not found — Empire Events" };
  return { title: `${a.name} — Empire Events`, description: a.bio };
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = getArtist(slug);
  if (!artist) notFound();

  const upcoming = artistEvents(artist);
  const past = [...artist.pastShows].sort((a, b) => b.date.localeCompare(a.date));

  const socials = [
    artist.socials.instagram && {
      label: `@${artist.socials.instagram}`,
      Icon: InstagramIcon,
    },
    artist.socials.soundcloud && { label: "SoundCloud", Icon: SoundcloudIcon },
    artist.socials.spotify && { label: "Spotify", Icon: SpotifyIcon },
  ].filter(Boolean) as { label: string; Icon: typeof InstagramIcon }[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/artists"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeftIcon width={15} height={15} />
        Artists
      </Link>

      {/* header */}
      <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-center">
        <Avatar name={artist.name} size={96} ring={false} src={artist.photo} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              {artist.name}
            </h1>
            {artist.verified && (
              <CheckCircleIcon width={22} height={22} className="shrink-0 text-accent" />
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-muted">
            {artist.role}
            <span className="text-faint">·</span>
            <PinIcon width={14} height={14} className="text-faint" />
            {artist.city}
          </p>
          <p className="mt-1 text-sm text-faint">
            <span className="font-semibold text-fg">{artist.followers}</span> followers
          </p>
        </div>
        <div className="shrink-0">
          <SubscribeButton slug={artist.slug} full />
        </div>
      </div>

      {/* bio + socials */}
      <div className="mt-6 max-w-2xl">
        <p className="leading-relaxed text-muted">{artist.bio}</p>
        {socials.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href="#"
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-surface-hover"
              >
                <s.Icon width={15} height={15} className="text-muted" />
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* upcoming */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-fg">Upcoming shows</h2>
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong py-12 text-center">
            <p className="font-semibold text-fg">No shows announced yet</p>
            <p className="mt-1 text-sm text-muted">
              Subscribe and we&rsquo;ll alert you the moment {artist.name.split(" ")[0]} adds a date.
            </p>
          </div>
        )}
      </section>

      {/* past */}
      {past.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-fg">Past shows</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="divide-y divide-line">
              {past.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <CalendarIcon width={16} height={16} className="shrink-0 text-faint" />
                  <span className="w-24 shrink-0 text-sm text-muted">
                    {dateShort(s.date)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-fg">{s.title}</span>
                    <span className="text-muted"> · {s.venue}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
