import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";
import { ArrowRightIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about" },
  description: "Empire Events is the home of electronic music ticketing in Colombo.",
};

const VALUES = [
  ["Curated nights", "Every event is a show we'd actually go to — no filler."],
  ["Fair, upfront pricing", "The price you see is the price you pay. No fees added at checkout."],
  ["Instant tickets", "Buy in seconds, get a QR code you scan at the door."],
];

export default function AboutPage() {
  return (
    <StaticPage
      eyebrow="Company"
      title="About Empire Events"
      intro="We're building the home of electronic music in Colombo — one place to discover the night and get your ticket in seconds."
    >
      <div className="space-y-4 text-sm leading-relaxed text-muted">
        <p>
          Empire Events started with a simple frustration: the best raves, festivals and club
          nights were scattered across flyers, group chats and last-minute links. We pulled them
          into one place — clean listings, honest pricing and tickets that just work.
        </p>
        <p>
          Today we help ravers find the right floor and help organizers fill it, from intimate
          warehouse sets to open-air festivals across the city.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {VALUES.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-fg">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>

      <Link
        href="/events"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
      >
        Browse events <ArrowRightIcon width={16} height={16} />
      </Link>
    </StaticPage>
  );
}
