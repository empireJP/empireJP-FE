import type { ReactNode } from "react";

/** Shared shell for the simple info/legal pages so they stay on-theme. */
export function StaticPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        {title}
      </h1>
      {intro && <p className="mt-3 text-lg leading-relaxed text-muted">{intro}</p>}
      <div className="mt-10">{children}</div>
    </div>
  );
}

/** A titled block for legal / policy copy. */
export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold text-fg">{heading}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
