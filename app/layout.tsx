import type { Metadata } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { CheckoutProvider } from "@/lib/checkout";
import { UserProvider } from "@/lib/user";
import { JsonLd } from "@/components/JsonLd";
import {
  DEFAULT_OG_IMAGE,
  OG_LOCALE,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/structured-data";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const techno = Chakra_Petch({
  variable: "--font-techno",
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Without metadataBase every relative og:image and canonical resolves
  // against whatever host served the request — including preview deployments,
  // which then advertise themselves as the real site.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Tickets for club nights, festivals and live shows`,
    // Pages set a bare title ("Explore events") and inherit the brand suffix,
    // so the two can never drift apart or double up.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: OG_LOCALE,
    url: SITE_URL,
    title: `${SITE_NAME} — Tickets for club nights, festivals and live shows`,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Tickets for club nights, festivals and live shows`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Let Google use full-size thumbnails and video previews; the defaults
      // are conservative and cost click-through on an image-led catalog.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    // Stops iOS Safari turning dates and ticket codes into blue "call" links.
    telephone: false,
    date: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={SITE_LOCALE}
      className={`${inter.variable} ${techno.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-bg text-fg antialiased">
        {/* Site-level nodes, emitted once. Page-level nodes (Event,
            BreadcrumbList) are added by the pages themselves and reference
            these by @id rather than repeating them. */}
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        <UserProvider>
          <CheckoutProvider>
            <TopNav />
            <main className="flex-1">{children}</main>
            <Footer />
            <BottomNav />
          </CheckoutProvider>
        </UserProvider>
      </body>
    </html>
  );
}
