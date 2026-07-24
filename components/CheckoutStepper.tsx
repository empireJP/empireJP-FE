import { CHECKOUT_STEPS, type StepKey, stepIndex } from "@/lib/steps";
import { CheckIcon } from "./Icons";

export function CheckoutStepper({ current }: { current: StepKey }) {
  const idx = stepIndex(current);
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2">
      {CHECKOUT_STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors ${
                  state === "done"
                    ? "bg-accent text-white"
                    : state === "current"
                    ? "bg-primary text-primary-fg"
                    : "border border-line text-faint"
                }`}
              >
                {state === "done" ? <CheckIcon width={13} height={13} /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  state === "todo" ? "text-faint" : "text-fg"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < CHECKOUT_STEPS.length - 1 && (
              <span
                className={`h-px w-4 sm:w-8 ${i < idx ? "bg-accent" : "bg-line-strong"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
