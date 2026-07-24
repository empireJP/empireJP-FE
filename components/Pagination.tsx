import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

/** Page list with ellipses: 1 … 4 5 6 … 20 */
function pageItems(page: number, count: number): (number | "dots")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = new Set([1, count, page, page - 1, page + 1]);
  const sorted = [...keep].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: (number | "dots")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) out.push("dots");
    out.push(n);
    prev = n;
  }
  return out;
}

export function Pagination({
  page,
  pageCount,
  onChange,
  className = "",
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const base =
    "grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-sm font-medium transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1.5 ${className}`}
    >
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={`${base} border-line text-muted hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ArrowLeftIcon width={16} height={16} />
      </button>

      {pageItems(page, pageCount).map((it, i) =>
        it === "dots" ? (
          <span key={`d${i}`} className="px-1 text-sm text-faint">
            …
          </span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it)}
            aria-current={it === page || undefined}
            className={`${base} ${
              it === page
                ? "border-transparent bg-primary text-primary-fg"
                : "border-line text-fg hover:bg-surface-hover"
            }`}
          >
            {it}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className={`${base} border-line text-muted hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ArrowRightIcon width={16} height={16} />
      </button>
    </nav>
  );
}
