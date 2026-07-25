"use client";

import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
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
  const { signedIn } = useUser();

  function go() {
    // Start the checkout either way — it survives the sign-in round trip in
    // sessionStorage, so the sign-in gate can show the order summary and
    // continue into ticket selection.
    startCheckout(slug);
    router.push(signedIn ? "/checkout/tickets" : "/checkout/signin");
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
