"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import type { EventItem, Order } from "@/lib/types";
import { QRTicket, ticketValue } from "./QRTicket";
import { DownloadIcon } from "./Icons";
import { dateLong } from "@/lib/format";

/** Renders an order's tickets and generates downloadable PNGs (per ticket + all). */
export function TicketsPanel({ event, order }: { event: EventItem; order: Order }) {
  const canvases = useRef<Map<string, HTMLCanvasElement>>(new Map());

  function compose(tickets: Order["tickets"]): HTMLCanvasElement | null {
    const dpr = 2;
    const W = 560;
    const pad = 22;
    const cardH = 168;
    const gap = 14;
    const headerH = tickets.length > 1 ? 92 : 22;
    const H = headerH + tickets.length * (cardH + gap) - gap + pad;

    const cv = document.createElement("canvas");
    cv.width = W * dpr;
    cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0b0b0f";
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "alphabetic";

    if (tickets.length > 1) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 21px Inter, system-ui, sans-serif";
      ctx.fillText(event.title, pad, 40);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.fillText(`${dateLong(event.date)} · ${event.venue}`, pad, 62);
      ctx.fillStyle = "#71717a";
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText(`Order ${order.code} · ${tickets.length} tickets`, pad, 82);
    }

    let y = headerH;
    for (const t of tickets) {
      const src = canvases.current.get(t.code);

      // card
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.roundRect(pad, y, W - pad * 2, cardH, 14);
      ctx.fill();

      // accent left bar
      ctx.fillStyle = "#006fee";
      ctx.beginPath();
      ctx.roundRect(pad, y + 16, 4, cardH - 32, 2);
      ctx.fill();

      // QR chip
      const box = cardH - 32;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(pad + 18, y + 16, box, box, 10);
      ctx.fill();
      if (src) ctx.drawImage(src, pad + 18 + 8, y + 16 + 8, box - 16, box - 16);

      // text
      const tx = pad + 18 + box + 22;
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 16px Inter, system-ui, sans-serif";
      ctx.fillText(event.title, tx, y + 42);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.fillText(`${t.tierName} · ${t.holder}`, tx, y + 66);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 18px ui-monospace, monospace";
      ctx.fillText(t.code, tx, y + 100);
      ctx.fillStyle = "#71717a";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.fillText("Scan at the door · Empire Events", tx, y + 122);

      y += cardH + gap;
    }
    return cv;
  }

  function download(cv: HTMLCanvasElement | null, filename: string) {
    if (!cv) return;
    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-fg">
          {order.tickets.length} ticket{order.tickets.length > 1 ? "s" : ""}
        </p>
        <button
          onClick={() => download(compose(order.tickets), `empire-tickets-${order.code}.png`)}
          className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-fg transition-colors hover:bg-surface-hover"
        >
          <DownloadIcon width={14} height={14} /> Download all
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {order.tickets.map((t, i) => (
          <QRTicket
            key={t.code}
            event={event}
            order={order}
            ticket={t}
            index={i}
            onDownload={() => download(compose([t]), `empire-ticket-${t.code}.png`)}
          />
        ))}
      </div>

      {/* hidden high-res QR canvases for export */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
        {order.tickets.map((t) => (
          <QRCodeCanvas
            key={t.code}
            value={ticketValue(order, t.code)}
            size={256}
            level="M"
            bgColor="#ffffff"
            fgColor="#0b0b0f"
            ref={(el) => {
              if (el) canvases.current.set(t.code, el);
            }}
          />
        ))}
      </div>
    </div>
  );
}
