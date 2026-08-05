import type { MetadataRoute } from "next";

/**
 * There was no robots file at all before private events, which meant a crawler
 * was free to walk anything it found a link to.
 *
 * `/e/` is deliberately NOT disallowed, which looks backwards until you follow
 * it through: `Disallow` stops the *fetch*, and a page that is never fetched is
 * a page whose `noindex` is never read. A token URL discovered from a link can
 * then still be indexed URL-only ("no information is available for this page"),
 * which puts the credential itself into a public search index — the exact
 * outcome this is meant to prevent. Letting the crawl through so the `noindex`
 * in app/e/[token]/page.tsx (and the `X-Robots-Tag` in next.config.ts, which
 * doesn't depend on HTML being parsed) is actually seen is the combination that
 * keeps it out.
 *
 * Checkout and account are disallowed as housekeeping: they need a session, so
 * crawling them is pure waste, and neither is a secret whose absence from the
 * index matters.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout/", "/account"],
    },
  };
}
