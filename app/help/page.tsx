import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/StaticPage";
import { ArrowRightIcon, ChevronRightIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Help Center — Empire Events",
  description: "Quick answers to the most common Empire Events questions.",
};

const FAQS: [string, React.ReactNode][] = [
  [
    "How do I buy tickets?",
    "Open any event, pick your tier and quantity, then check out with your card. Your tickets are ready instantly — no waiting.",
  ],
  [
    "Where are my tickets?",
    "Right after checkout they appear on your confirmation and in your account under Tickets. Each one has a QR code you show at the door.",
  ],
  [
    "Do I need to print anything?",
    "No. Show the QR code from your phone — a screenshot works too if you're offline.",
  ],
  [
    "Can I get a refund?",
    <>
      Cancelled and rescheduled events are covered. See the{" "}
      <Link href="/refunds" className="text-accent hover:underline">
        refund policy
      </Link>{" "}
      for the details.
    </>,
  ],
  [
    "Can I transfer a ticket to a friend?",
    "Some organizers allow name changes on a ticket — check the event page. Otherwise the QR code can be shown by whoever is attending.",
  ],
  [
    "I still need help.",
    <>
      Reach a human on the{" "}
      <Link href="/contact" className="text-accent hover:underline">
        contact page
      </Link>{" "}
      — we reply within 24 hours.
    </>,
  ],
];

export default function HelpPage() {
  return (
    <StaticPage
      eyebrow="Support"
      title="Help Center"
      intro="The quick answers. Tap a question to expand it."
    >
      <div className="rounded-2xl border border-line bg-surface px-5">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group border-b border-line py-4 last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-fg marker:hidden [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronRightIcon
                width={16}
                height={16}
                className="shrink-0 text-faint transition-transform duration-200 group-open:rotate-90"
              />
            </summary>
            <div className="mt-2 text-sm leading-relaxed text-muted">{a}</div>
          </details>
        ))}
      </div>

      <Link
        href="/contact"
        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-fg transition-colors hover:text-accent"
      >
        Still stuck? Contact us <ArrowRightIcon width={16} height={16} />
      </Link>
    </StaticPage>
  );
}
