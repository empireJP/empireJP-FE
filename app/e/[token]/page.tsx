import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventByToken } from "@/lib/api";
import { EventDetail } from "@/components/EventDetail";

/**
 * A private event, reached by its share link.
 *
 * Everything crawler-facing is deliberately withheld. `noindex` stops the page
 * being listed if the URL is ever pasted somewhere public, and the title and
 * description stay generic so a link unfurled in a chat app doesn't preview
 * the event to a room that was never invited.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Private event — Empire Events",
    robots: { index: false, follow: false, nocache: true },
    // The URL itself is the credential — don't hand it to whatever the next
    // page links out to.
    referrer: "no-referrer",
  };
}

export default async function SharedEventPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const event = await getEventByToken(token);
  // Unknown, rotated, unpublished, deleted, malformed — one answer for all of
  // them, matching what the API already refuses to distinguish.
  if (!event) notFound();

  // The token travels into checkout with the event: the API won't serve this
  // event by slug, so without it the checkout re-fetch 404s and the buyer
  // lands on an empty cart right after clicking Get Tickets.
  return <EventDetail event={event} shareToken={token} />;
}
