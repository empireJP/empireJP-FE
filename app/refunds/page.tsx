import type { Metadata } from "next";
import { Section, StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Refunds — Empire Events",
  description: "When you can get a refund or exchange on Empire Events tickets.",
};

export default function RefundsPage() {
  return (
    <StaticPage
      eyebrow="Support"
      title="Refunds & exchanges"
      intro="Short version: cancelled or rescheduled shows are covered. Change of plans usually isn't."
    >
      <Section heading="Event cancelled">
        <p>
          If an organizer cancels, you get a full automatic refund to your original payment method —
          no need to ask. It lands within 5–10 business days.
        </p>
      </Section>
      <Section heading="Event rescheduled">
        <p>
          Your ticket stays valid for the new date. If you can&rsquo;t make it, request a refund
          within 14 days of the announcement.
        </p>
      </Section>
      <Section heading="Change of mind">
        <p>
          Tickets are generally non-refundable once purchased. Some organizers allow name changes or
          resale — check the event page for details.
        </p>
      </Section>
      <Section heading="How to request">
        <p>
          Head to your{" "}
          <a href="/account" className="text-accent hover:underline">
            account
          </a>{" "}
          to find the order, or reach us from the{" "}
          <a href="/contact" className="text-accent hover:underline">
            contact page
          </a>{" "}
          with your order code. We reply within 24 hours.
        </p>
      </Section>
    </StaticPage>
  );
}
