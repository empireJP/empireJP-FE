import { QRCodeSVG } from "qrcode.react";
import type { EventItem, Order } from "@/lib/types";
import { EventCover } from "./EventCover";
import { CalendarIcon, DownloadIcon, PinIcon } from "./Icons";
import { dateShort, to12h } from "@/lib/format";

// The QR payload is the BARE ticket code — the same thing the BE's emailed
// QR PNGs encode, and exactly what the door scanner's check-in endpoint
// expects (empireJP-BE docs/DECISIONS.md 2026-07-23: trust lives in
// server-side validation at scan time, not in the payload). Kept as a helper
// so every QR on the page renders from one definition.
export function ticketValue(code: string) {
  return code;
}

export function QRTicket({
  event,
  ticket,
  index,
  onDownload,
}: {
  event: EventItem;
  ticket: Order["tickets"][number];
  index: number;
  onDownload?: () => void;
}) {
  const value = ticketValue(ticket.code);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
      {/* accent strip */}
      <div className="h-1.5 w-full bg-primary" />
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        {/* details */}
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="h-14 w-14 shrink-0">
            <EventCover src={event.image} alt={event.title} accent={event.accent} className="h-full w-full" rounded="rounded-xl" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{event.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <CalendarIcon width={12} height={12} className="text-faint" />
              {dateShort(event.date)} · {to12h(event.startTime)}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <PinIcon width={12} height={12} className="text-faint" />
              {event.venue} · {event.city}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>
                <span className="text-faint">Ticket </span>
                <span className="font-semibold text-fg">{ticket.tierName}</span>
              </span>
              <span>
                <span className="text-faint">Holder </span>
                <span className="font-semibold text-fg">{ticket.holder}</span>
              </span>
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="flex items-center gap-3 border-t border-dashed border-line pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="rounded-xl bg-white p-2 shadow-sm">
            <QRCodeSVG value={value} size={92} level="M" bgColor="#ffffff" fgColor="#0b0b0f" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-faint">Ticket {index + 1}</p>
            <p className="tnum font-mono text-sm font-semibold tracking-tight text-fg">
              {ticket.code}
            </p>
            <p className="mt-1 text-[10px] text-faint">Scan at the door</p>
            {onDownload && (
              <button
                onClick={onDownload}
                className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-fg"
              >
                <DownloadIcon width={11} height={11} /> Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
