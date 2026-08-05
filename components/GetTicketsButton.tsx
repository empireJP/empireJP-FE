"use client";

import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
import { TicketIcon } from "./Icons";

/**
 * Why this can be off, in the order it's decided.
 *
 * `ended` and `salesClosed` come from the API (`EventItem`), never from a
 * date comparison here — and the API refuses the order too, so this is the
 * courteous half of the gate, not the enforcing one.
 */
function unavailable(
  ended: boolean,
  salesClosed: boolean,
  soldOut: boolean,
): { label: string; reason: string } | null {
  if (ended) {
    return { label: "Event ended", reason: "This event has already taken place." };
  }
  // Only reachable when a business closed sales early — otherwise the cutoff
  // is the end of the show and `ended` above has already caught it.
  if (salesClosed) {
    return { label: "Sales closed", reason: "Ticket sales for this event have closed." };
  }
  if (soldOut) {
    return { label: "Sold Out", reason: "Every ticket for this event has been sold." };
  }
  return null;
}

export function GetTicketsButton({
  slug,
  shareToken,
  soldOut,
  ended,
  salesClosed,
  className = "",
}: {
  slug: string;
  /** Present only for a private event. Carried into checkout because the API
   *  refuses to serve a private event by slug — without it every step after
   *  this button re-fetches and gets a 404. */
  shareToken?: string;
  soldOut?: boolean;
  ended?: boolean;
  salesClosed?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { startCheckout } = useCheckout();
  const { signedIn } = useUser();

  const blocked = unavailable(Boolean(ended), Boolean(salesClosed), Boolean(soldOut));

  function go() {
    // Start the checkout either way — it survives the sign-in round trip in
    // sessionStorage, so the sign-in gate can show the order summary and
    // continue into ticket selection.
    startCheckout(slug, shareToken);
    router.push(signedIn ? "/checkout/tickets" : "/checkout/signin");
  }

  return (
    // `title` on the wrapper, not the button: browsers don't show a tooltip
    // for a disabled control, so hovering the button itself would explain
    // nothing — which is the whole point of the hover here.
    <span className={`group relative block ${blocked ? "cursor-not-allowed" : ""}`}>
      <button
        onClick={go}
        disabled={blocked !== null}
        // Read out on focus as well as hover, since a disabled button is
        // skipped by the keyboard and a mouse-only explanation excludes
        // anyone not using one.
        aria-describedby={blocked ? `tickets-reason-${slug}` : undefined}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <TicketIcon width={18} height={18} />
        {blocked?.label ?? "Get Tickets"}
      </button>

      {blocked && (
        <span
          id={`tickets-reason-${slug}`}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-surface-3 px-2.5 py-1.5 text-center text-xs font-medium text-fg opacity-0 shadow-[var(--shadow-pop)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {blocked.reason}
        </span>
      )}
    </span>
  );
}
