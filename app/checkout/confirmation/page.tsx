"use client";

// Confirmation. This page is reached as soon as the buyer is done with the
// payment popup — which is *before* we know whether they paid.
//
// An order becomes PAID only when the gateway's server-to-server callback
// reaches our API, so this page keeps polling until it does. Until then it
// shows a processing state rather than the celebration: telling someone
// they're going and then discovering the payment failed is far worse than
// making them wait a few seconds.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
import { CheckoutShell } from "@/components/CheckoutShell";
import { TicketsPanel } from "@/components/TicketsPanel";
import {
  CalendarPlusIcon,
  CheckCircleIcon,
  CompassIcon,
  MailIcon,
  ShareIcon,
} from "@/components/Icons";
import { dateLong, money, to12h } from "@/lib/format";
import { createLogger } from "@/lib/logger";

const log = createLogger("checkout.confirmation");

function gcalUrl(title: string, iso: string, endTime: string, location: string) {
  const start = new Date(iso);
  const [eh, em] = endTime.split(":").map(Number);
  const end = new Date(iso);
  end.setHours(eh, em, 0, 0);
  if (end <= start) end.setDate(end.getDate() + 1);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function ConfirmationStep() {
  const { event, order, awaitPaidOrder } = useCheckout();
  const { addOrder } = useUser();

  const paid = order?.status === "PAID";
  // A status that will never become PAID (EXPIRED, CANCELLED). Treated apart
  // from "still waiting" because the buyer's next action is different.
  const settledUnpaid = Boolean(order && order.status && order.status !== "PENDING" && !paid);
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false);

  // Keep asking the API until the gateway callback lands. Guarded by a ref so
  // React's double-invoked effects don't start two polling loops.
  const polling = useRef(false);
  useEffect(() => {
    if (!order || paid || settledUnpaid || polling.current) return;
    polling.current = true;
    void awaitPaidOrder(order).then((result) => {
      polling.current = false;
      if (result?.status === "PAID") return;
      // Not a failure — a slow callback still arrives, and the order still
      // holds its seats. But a *persistent* one of these is what a broken
      // notify URL looks like from the buyer's side, so it gets a line.
      log.warn("order not confirmed within the polling window", {
        code: order.code,
        status: result?.status ?? order.status,
      });
      setGaveUpWaiting(true);
    });
  }, [order, paid, settledUnpaid, awaitPaidOrder]);

  // Save to the buyer's account only once it is actually paid — an unpaid
  // order in the tickets tab is a support ticket waiting to happen.
  useEffect(() => {
    if (order && paid) addOrder(order);
  }, [order, paid, addOrder]);

  return (
    <CheckoutShell step="confirmation" title="" hideSummary requireOrder>
      {order && !paid && (
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-surface-2">
            {settledUnpaid ? (
              <MailIcon width={30} height={30} className="text-muted" />
            ) : (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent" />
            )}
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-fg">
            {settledUnpaid ? "This order didn't complete" : "Confirming your payment…"}
          </h1>
          <p className="mt-2 text-muted">
            {settledUnpaid
              ? "No payment was taken. You can start again and your tickets will be re-checked for availability."
              : gaveUpWaiting
                ? "This is taking longer than usual. Your payment may still be going through — keep this page open, and check your email in a few minutes."
                : "Your bank is confirming the payment. This usually takes a few seconds."}
          </p>
          <div className="mt-5 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <span className="text-faint">Order </span>
            <span className="font-mono font-semibold text-fg">{order.code}</span>
          </div>
          <p className="mt-4 text-xs text-faint">
            Don&rsquo;t refresh or close this page — nothing is lost if you do, but the
            confirmation lands here first.
          </p>
          {settledUnpaid && (
            <Link
              href={`/events/${order.eventSlug}`}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
            >
              Try again
            </Link>
          )}
        </div>
      )}

      {order && paid && event && (
        <div className="animate-pop-in mx-auto max-w-xl">
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircleIcon width={38} height={38} />
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-fg">
              You&rsquo;re going! 🎉
            </h1>
            <p className="mt-2 text-muted">
              {order.tickets.length} ticket{order.tickets.length > 1 ? "s" : ""} to{" "}
              <span className="font-medium text-fg">{event.title}</span>.
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
              <MailIcon width={15} height={15} className="text-faint" />
              Sent to {order.buyerEmail || "your inbox"}
            </p>
          </div>

          {/* order meta */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <div>
              <span className="text-faint">Order </span>
              <span className="font-mono font-semibold text-fg">{order.code}</span>
            </div>
            <div className="text-muted">
              {dateLong(event.date)} · {to12h(event.startTime)}
            </div>
            <div className="font-semibold text-fg">{money(order.total)}</div>
          </div>

          {/* tickets */}
          <div className="mt-5">
            <TicketsPanel event={event} order={order} />
          </div>

          {/* actions */}
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <a
              href={gcalUrl(event.title, event.date, event.endTime, `${event.venue}, ${event.area}, ${event.city}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
            >
              <CalendarPlusIcon width={17} height={17} /> Add to calendar
            </a>
            <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover">
              <ShareIcon width={17} height={17} /> Share
            </button>
          </div>

          <Link
            href="/"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            <CompassIcon width={17} height={17} /> Discover more events
          </Link>

          <p className="mt-4 text-center text-xs text-faint">
            Present the QR code{order.tickets.length > 1 ? "s" : ""} at the door. Screenshots
            work too. Need help? Contact {event.organizer.name}.
          </p>
        </div>
      )}
    </CheckoutShell>
  );
}
