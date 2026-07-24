import type { Metadata } from "next";
import { ARTISTS } from "@/lib/artists";
import { ArtistCard } from "@/components/ArtistCard";
import { BellIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Artists — Empire Events",
  description: "Follow your favourite DJs and get their new shows first.",
};

export default function ArtistsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Artists</h1>
        <p className="mt-1 flex items-center gap-1.5 text-muted">
          <BellIcon width={16} height={16} className="text-accent" />
          Subscribe to get an alert the moment your favourites announce a new show.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {ARTISTS.map((a) => (
          <ArtistCard key={a.slug} artist={a} />
        ))}
      </div>
    </div>
  );
}
