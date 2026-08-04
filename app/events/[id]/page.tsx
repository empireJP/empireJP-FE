import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEvent } from "@/lib/api";
import { EventDetail } from "@/components/EventDetail";

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
  // Public events only: the API 404s a private event's slug on purpose, so it
  // can't be reached by guessing a slug built from a title someone overheard.
  // Private events live at /e/<token>.
  const event = await getEvent(id);
  if (!event) notFound();

  return <EventDetail event={event} />;
}
