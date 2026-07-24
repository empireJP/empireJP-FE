import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { ArrowRightIcon } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md place-items-center px-6 py-32 text-center">
      <LogoMark size={48} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-fg">
        This event has ended
      </h1>
      <p className="mt-2 text-muted">
        We couldn&rsquo;t find the page you&rsquo;re looking for. It may have been
        moved or the link is incorrect.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
      >
        Back to Explore
        <ArrowRightIcon width={16} height={16} />
      </Link>
    </div>
  );
}
