"use client";

import Link from "next/link";
import { useEffect } from "react";
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
  const { event, order } = useCheckout();
  const { addOrder } = useUser();

  // save the completed order to the buyer's account (dedups by code)
  useEffect(() => {
    if (order) addOrder(order);
  }, [order, addOrder]);

  return (
    <CheckoutShell step="confirmation" title="" hideSummary requireOrder>
      {order && event && (
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
