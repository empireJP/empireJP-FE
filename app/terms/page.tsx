import type { Metadata } from "next";
import { Section, StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Terms of Service — Empire Events",
  description: "The terms that apply when you buy tickets on Empire Events.",
};

export default function TermsPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="The basics of using Empire Events. Plain language, no surprises."
    >
      <Section heading="Your tickets">
        <p>
          A ticket is a licence to attend one event. Each QR code admits one person once — keep it
          private and don&rsquo;t share screenshots publicly.
        </p>
      </Section>
      <Section heading="Payments">
        <p>
          Prices are shown in the currency at checkout, and the price you see is the price you pay
          — no booking or service fees are added. Orders are confirmed only once payment succeeds.
        </p>
      </Section>
      <Section heading="Entry">
        <p>
          Organizers set the age limit, entry times and conduct rules for each event. You must
          follow venue and staff instructions; entry may be refused for unsafe behaviour.
        </p>
      </Section>
      <Section heading="Changes & cancellations">
        <p>
          If an event is cancelled or rescheduled we&rsquo;ll email you with your options. Refunds
          for cancelled events follow our{" "}
          <a href="/refunds" className="text-accent hover:underline">
            refund policy
          </a>
          .
        </p>
      </Section>
      <Section heading="Liability">
        <p>
          Empire Events is a ticketing platform, not the event organizer. We aren&rsquo;t
          responsible for the event itself, but we&rsquo;ll always help resolve ticketing issues.
        </p>
      </Section>
      <p className="mt-8 text-xs text-faint">
        Demo terms for a portfolio project — not legal advice. Last updated July 2026.
      </p>
    </StaticPage>
  );
}
