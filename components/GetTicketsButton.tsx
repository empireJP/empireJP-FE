"use client";

import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { TicketIcon } from "./Icons";

export function GetTicketsButton({
  slug,
  soldOut,
  className = "",
}: {
  slug: string;
  soldOut?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { startCheckout } = useCheckout();

  function go() {
    startCheckout(slug);
    router.push("/checkout/tickets");
  }

  return (
    <button
      onClick={go}
      disabled={soldOut}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <TicketIcon width={18} height={18} />
      {soldOut ? "Sold Out" : "Get Tickets"}
    </button>
  );
}
