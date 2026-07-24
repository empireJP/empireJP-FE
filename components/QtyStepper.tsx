"use client";

import { MinusIcon, PlusIcon } from "./Icons";

export function QtyStepper({
  value,
  onChange,
  max = 10,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-8 w-8 place-items-center rounded-full border border-line text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MinusIcon width={15} height={15} />
      </button>
      <span className="tnum w-8 text-center text-sm font-semibold text-fg">{value}</span>
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-8 w-8 place-items-center rounded-full border border-line text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusIcon width={15} height={15} />
      </button>
    </div>
  );
}
