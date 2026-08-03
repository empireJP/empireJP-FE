import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  CardIcon,
  CheckIcon,
  SparkleIcon,
  TicketIcon,
  UsersIcon,
  WaveIcon,
} from "@/components/Icons";

export const metadata: Metadata = {
  title: "Sell tickets with Empire Events",
  description:
    "Publish a polished event page, take payments, and manage your audience in one place. Empire Events for organizers and promoters.",
  alternates: { canonical: "/organizers" },
  openGraph: {
    type: "website",
    url: "/organizers",
    title: "Sell tickets with Empire Events",
    description:
      "Publish a polished event page, take payments, and manage your audience in one place.",
  },
};

const FEATURES = [
  { icon: TicketIcon, title: "Beautiful event pages", body: "Publish a polished, on-brand page in minutes. Multiple ticket tiers, capacity limits, and access codes built in." },
  { icon: CardIcon, title: "Checkout that converts", body: "A fast, mobile-first flow with Apple Pay and cards. Fewer taps, fewer drop-offs, more sales." },
  { icon: UsersIcon, title: "Audience CRM", body: "Every buyer in one place. Segment by event, spend or loyalty — then message, comp or check them in." },
  { icon: WaveIcon, title: "Real-time insights", body: "Track revenue, fill rate and sales velocity live. Know what's working before doors open." },
];

const STEPS = [
  ["Create your event", "Add details, artwork and ticket tiers. Go live in minutes."],
  ["Share your link", "Sell everywhere — social, email, or embedded on your site."],
  ["Manage the room", "Track sales, check guests in, and grow your audience."],
];

export default function OrganizersPage() {
  return (
    <div>
      {/* hero */}
      <section className="relative">
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm font-medium text-muted">
            <SparkleIcon width={15} height={15} className="text-accent" /> Empire Events for Organizers
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-6xl">
            Sell tickets.
            <br />
            Fill the room.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            The all-in-one platform to launch events, sell tickets, and manage your
            audience — with a checkout your fans actually enjoy.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-fg shadow-sm transition-transform hover:bg-primary-hover active:scale-[0.97]"
            >
              Open dashboard <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link
              href="#pricing"
              className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
            >
              See pricing
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted">
            {[["$2M+", "processed"], ["18k+", "tickets sold"], ["99.9%", "uptime"]].map(([v, l]) => (
              <div key={l}>
                <span className="text-xl font-bold text-fg">{v}</span> {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <f.icon width={20} height={20} />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{f.title}</h3>
              <p className="mt-1.5 text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* steps */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-fg">Live in three steps</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <div key={title} className="text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-fg">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-4 sm:px-6">
        <div className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
          <div className="border-b border-line bg-surface-2 p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Simple pricing</p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-fg">
              2% <span className="text-lg font-medium text-muted">+ $0.79</span>
            </p>
            <p className="text-sm text-muted">per paid ticket · free events are always free</p>
          </div>
          <div className="p-6">
            <ul className="flex flex-col gap-3">
              {[
                "Unlimited events & ticket tiers",
                "Apple Pay, cards & instant payouts",
                "Audience CRM, check-in & messaging",
                "Real-time analytics dashboard",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-fg">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-success-soft text-success">
                    <CheckIcon width={13} height={13} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
            >
              Open your dashboard <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
