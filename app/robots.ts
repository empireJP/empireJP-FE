import type { MetadataRoute } from "next";

/**
 * There was no robots file at all before private events, which meant a crawler
 * was free to walk anything it found a link to.
 *
 * `/e/` is the one path that must never be crawled: its URL *is* the
 * credential for a private event, so a link pasted into a public channel would
 * otherwise put the event in a search index. The per-page `noindex` in
 * app/e/[token]/page.tsx says the same thing to a crawler that gets there
 * anyway — this stops the fetch, that stops the listing.
 *
 * Checkout and account are disallowed as housekeeping: they need a session and
 * a crawl of them is pure waste.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/e/", "/checkout/", "/account"],
    },
  };
}
