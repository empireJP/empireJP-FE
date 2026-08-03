import type { Metadata } from "next";
import { StaticPage } from "@/components/StaticPage";
import {
  ChevronRightIcon,
  InstagramIcon,
  MailIcon,
  WhatsappIcon,
} from "@/components/Icons";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
  description: "Reach the Empire Events team — we reply within 24 hours.",
};

const CHANNELS = [
  {
    label: "Email us",
    value: "hello@empire.events",
    href: "mailto:hello@empire.events",
    Icon: MailIcon,
    color: "#006fee",
  },
  {
    label: "WhatsApp",
    value: "Chat with support",
    href: "https://www.whatsapp.com/",
    Icon: WhatsappIcon,
    color: "#25D366",
  },
  {
    label: "Instagram",
    value: "@empireevents",
    href: "https://www.instagram.com/",
    Icon: InstagramIcon,
    color: "#E4405F",
  },
];

export default function ContactPage() {
  return (
    <StaticPage
      eyebrow="Support"
      title="Contact us"
      intro="Ticket trouble or a question about an event? Pick whatever's easiest — we reply within 24 hours."
    >
      <div className="space-y-3">
        {CHANNELS.map(({ label, value, href, Icon, color }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-pop)]"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
              style={{ backgroundColor: color }}
            >
              <Icon width={22} height={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
              <p className="truncate font-semibold text-fg">{value}</p>
            </div>
            <ChevronRightIcon
              width={18}
              height={18}
              className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-fg"
            />
          </a>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        Support hours: Mon–Sat, 10am–8pm (GMT+5:30). Have your order code handy for the fastest help.
      </p>
    </StaticPage>
  );
}
