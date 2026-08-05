import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Private event pages. The route already sets `noindex` in its
        // metadata, but that lives in the HTML and only counts if a crawler
        // parses the document; the header says the same thing to anything that
        // merely fetches the URL.
        //
        // Paired with robots.ts deliberately NOT disallowing `/e/`: a
        // disallowed URL is never fetched, so neither signal would ever be
        // read, and the URL could still be indexed on its own. The token IS the
        // credential, so keeping it out of the index is the whole point.
        source: "/e/:token*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          // The URL is a secret — don't hand it to whatever the page links out
          // to. Also set in the route's metadata, for clients that only read
          // one of the two.
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
