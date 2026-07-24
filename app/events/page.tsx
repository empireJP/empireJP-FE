import type { Metadata } from "next";
import { CATEGORIES, upcomingEvents } from "@/lib/data";
import type { Category } from "@/lib/types";
import { ExploreClient } from "@/components/ExploreClient";

export const metadata: Metadata = {
  title: "All Events — Empire Events",
  description: "Every upcoming electronic night, festival and club show across Colombo.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  const events = upcomingEvents();
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
