import type { Metadata } from "next";
import { CATEGORIES } from "@/lib/data";
import { getEvents } from "@/lib/api";
import type { Category } from "@/lib/types";
import { ExploreClient } from "@/components/ExploreClient";

export const metadata: Metadata = {
  title: "Explore events",
  description:
    "Every upcoming club night, festival and live show on Empire Events — browse by city, category or date, and book in seconds.",
  alternates: { canonical: "/events" },
  openGraph: {
    type: "website",
    url: "/events",
    title: "Explore events — Empire Events",
    description:
      "Every upcoming club night, festival and live show on Empire Events.",
  },
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const { events } = await getEvents({ sort: "date", limit: 50 });
  const initial = CATEGORIES.includes(sp.category as Category)
    ? (sp.category as Category)
    : "All";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-fg">All events</h1>
        <p className="mt-1 text-muted">
          {events.length} upcoming nights across Colombo — filter by vibe or search a name.
        </p>
      </div>
      <ExploreClient events={events} categories={CATEGORIES} initialCategory={initial} />
    </div>
  );
}
