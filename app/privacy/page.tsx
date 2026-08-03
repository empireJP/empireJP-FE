import type { Metadata } from "next";
import { Section, StaticPage } from "@/components/StaticPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "What data Empire Events collects and how it's used.",
};

export default function PrivacyPage() {
  return (
    <StaticPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="What we collect, why we collect it, and the control you have over it."
    >
      <Section heading="What we collect">
        <p>
          Your name and email to create tickets and orders, and basic device data to keep the site
          secure and fast. We never ask for more than we need.
        </p>
      </Section>
      <Section heading="How we use it">
        <p>
          To process your orders, send order confirmations and QR tickets, and let you know if an
          event you booked changes.
        </p>
      </Section>
      <Section heading="Sharing">
        <p>
          We share only what an event organizer needs to admit you at the door. We don&rsquo;t sell
          your data to anyone.
        </p>
      </Section>
      <Section heading="Cookies">
        <p>
          We use essential cookies to keep you signed in and remember your cart. No third-party ad
          tracking.
        </p>
      </Section>
      <Section heading="Your choices">
        <p>
          You can view your orders and update your details anytime from your{" "}
          <a href="/account" className="text-accent hover:underline">
            account
          </a>
          , or ask us to delete your data via the contact page.
        </p>
      </Section>
      <p className="mt-8 text-xs text-faint">
        Demo policy for a portfolio project — no real personal data is stored. Last updated July 2026.
      </p>
    </StaticPage>
  );
}
