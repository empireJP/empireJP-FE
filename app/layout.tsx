import type { Metadata } from "next";
import { Inter, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { CheckoutProvider } from "@/lib/checkout";
import { UserProvider } from "@/lib/user";

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
  title: "Empire Events — Sell tickets, fill the room",
  description:
    "Discover events near you and get your ticket in seconds. Organizers sell tickets and manage their audience in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${techno.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-bg text-fg antialiased">
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
