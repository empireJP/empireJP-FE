"use client";

import { useState } from "react";
import { ApiError, registerForEvent } from "@/lib/api";
import { CheckCircleIcon, TicketIcon } from "./Icons";

/**
 * The register form that stands in for the ticket panel on an RSVP event.
 *
 * Registering does not admit anyone — it asks. The organizer approves or
 * declines, and the registrant hears by email, so the success state says
 * "pending" rather than anything that reads like a confirmed place.
 *
 * No sign-in required, matching guest checkout: the share link is the
 * credential and asking for an account first would kill the flow the link
 * exists to enable.
 */
export function RsvpPanel({ token, closed }: { token: string; closed: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setError(null);
    setState("sending");
    try {
      await registerForEvent(token, { name: name.trim(), email: email.trim() });
      setState("done");
    } catch (err) {
      setState("idle");
      // The two the API actually raises here are worth naming; anything else
      // gets the generic line rather than a raw server message.
      if (err instanceof ApiError && err.code === "ALREADY_REGISTERED") {
        setError("That email is already registered for this event.");
      } else if (err instanceof ApiError && err.code === "RSVP_CLOSED") {
        setError("Registration for this event has closed.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  if (state === "done") {
    return (
      <div className="mt-7 rounded-2xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent">
          <CheckCircleIcon width={22} height={22} />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-fg">Registration sent</h2>
        <p className="mt-1.5 text-sm text-muted">
          The organizer reviews each request. You&apos;ll get an email at{" "}
          <span className="font-medium text-fg">{email}</span> once they decide.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <TicketIcon width={16} height={16} className="text-muted" /> Registration
        </span>
        <span className="text-sm text-muted">{closed ? "Closed" : "Free · Approval needed"}</span>
      </div>

      {closed ? (
        <p className="px-5 py-6 text-center text-sm text-muted">
          Registration for this event has closed.
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              autoComplete="name"
              className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Your name"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-faint">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              autoComplete="email"
              className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="you@example.com"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={state === "sending"}
            className="mt-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Request a place"}
          </button>
          <p className="text-center text-xs text-faint">
            The organizer approves each guest · You&apos;ll hear by email
          </p>
        </form>
      )}
    </div>
  );
}
