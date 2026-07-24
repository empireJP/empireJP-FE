import Link from "next/link";

/** The Empire Events block mark (green grid), for icon-only spots. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/empire-mark.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** Full Empire Events lockup (mark + wordmark). */
export function Logo() {
  return (
    <Link href="/" aria-label="Empire Events" className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/empire-logo.png"
        alt="Empire Events"
        width={149}
        height={24}
        className="h-6 w-auto sm:h-7"
      />
    </Link>
  );
}
