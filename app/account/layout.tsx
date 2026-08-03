import type { Metadata } from "next";

/** Signed-in surface — nothing here belongs in an index. The page itself is a
 *  client component and can't export metadata, hence this pass-through. */
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false, nocache: true },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
