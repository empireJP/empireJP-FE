import type { Metadata } from "next";

/**
 * Checkout is never a search result.
 *
 * A pass-through layout that exists only to carry `noindex`: the steps under
 * it are client components, which cannot export metadata themselves. Every
 * child inherits this unless it says otherwise.
 *
 * robots.txt also disallows /checkout/, but the two do different jobs — a
 * crawler that never fetches the page cannot read a noindex, and one that
 * reaches it from an external link never consults robots.txt for permission to
 * *index* what it already has. Belt and braces is the correct configuration
 * here, not redundancy.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
