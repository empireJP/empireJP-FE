import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt
 *
 * The disallow list is about crawl budget and duplicate content, NOT privacy —
 * robots.txt is public and advisory. Anything genuinely private is protected
 * by the session check on the route; these paths also carry `noindex` in their
 * own metadata, which is what actually keeps them out of the index. (A page
 * blocked here *cannot* be read, so its noindex would never be seen — hence
 * both, on different paths: crawl-blocked below, noindex on the pages.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Funnel steps: no standalone search value, and they'd burn crawl
          // budget on states that only make sense mid-purchase.
          "/checkout/",
          // Signed-in surfaces. Empty or redirecting to a crawler.
          "/account",
          "/dashboard",
          // Next internals and any route handlers.
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
