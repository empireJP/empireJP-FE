// The PayHere popup launcher. Its job is to fail loudly rather than leave a
// Pay button that does nothing — an ad blocker eating the SDK is a realistic
// production failure — and to resolve exactly once even when PayHere fires two
// handlers for one problem.
//
// The module caches in-flight loads in a module-scoped Map, so every test
// re-imports it fresh; otherwise a resolved SDK from one test satisfies the
// next one's load.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentInstruction } from "./types";

const SDK_URL = "https://sandbox.payhere.lk/lib/payhere.js";

function instruction(over: Partial<PaymentInstruction> = {}): PaymentInstruction {
  return {
    kind: "popup",
    sdkUrl: SDK_URL,
    actionUrl: "https://sandbox.payhere.lk/pay/checkout",
    fields: { merchant_id: "1234567", order_id: "EMP-1", hash: "A1B2C3" },
    sandbox: true,
    ...over,
  } as PaymentInstruction;
}

/** A fresh copy of the module, so its load cache starts empty. */
async function freshModule() {
  vi.resetModules();
  return import("./payhere");
}

/**
 * Lets the loadSdk promise settle.
 *
 * The SDK's handlers are assigned inside the `.then` that follows the script's
 * onload, so a test that fires onDismissed in the same tick as succeed() finds
 * the property still unset.
 */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Intercepts the <script> the loader appends and hands back a way to drive it.
 *
 * The loader appends to document.head and waits on the element's own
 * onload/onerror, so the test has to observe the append and then fire the
 * event the scenario needs.
 */
function interceptScript() {
  const appended: HTMLScriptElement[] = [];
  const spy = vi
    .spyOn(document.head, "appendChild")
    .mockImplementation(((node: Node) => {
      appended.push(node as HTMLScriptElement);
      return node;
    }) as typeof document.head.appendChild);

  return {
    spy,
    get script() {
      return appended.at(-1)!;
    },
    get count() {
      return appended.length;
    },
    /** Simulates the SDK loading and installing its global. */
    succeed(sdk: Partial<Window["payhere"]> = {}) {
      window.payhere = {
        startPayment: vi.fn(),
        ...sdk,
      } as NonNullable<Window["payhere"]>;
      appended.at(-1)!.onload!(new Event("load"));
    },
    /** Simulates the script loading but installing nothing (captive portal). */
    succeedWithoutGlobal() {
      delete window.payhere;
      appended.at(-1)!.onload!(new Event("load"));
    },
    /** Simulates a blocked or offline load. */
    fail() {
      appended.at(-1)!.onerror!(new Event("error"));
    },
  };
}

beforeEach(() => {
  delete window.payhere;
});

afterEach(() => {
  delete window.payhere;
  vi.useRealTimers();
});

describe("instruction validation", () => {
  // If the API ever switches this order to a redirect flow, failing here beats
  // opening nothing and leaving the buyer staring at a dead button.
  it("rejects an instruction with no sdkUrl instead of doing nothing", async () => {
    const { startPayHerePayment } = await freshModule();

    await expect(
      startPayHerePayment(instruction({ sdkUrl: undefined }), "EMP-1")
    ).rejects.toThrow("This payment method needs a page reload to continue");
  });
});

describe("SDK loading", () => {
  it("appends the script from the URL the API supplied", async () => {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();

    const pending = startPayHerePayment(instruction(), "EMP-1");
    expect(script.script.src).toBe(SDK_URL);
    expect(script.script.async).toBe(true);

    script.succeed();
    await flush();
    window.payhere!.onDismissed!();
    await expect(pending).resolves.toEqual({ result: "dismissed" });
  });

  it("reuses an already-installed global without appending a second script", async () => {
    const { startPayHerePayment } = await freshModule();
    window.payhere = { startPayment: vi.fn() } as NonNullable<Window["payhere"]>;
    const script = interceptScript();

    const pending = startPayHerePayment(instruction(), "EMP-1");
    await flush();
    window.payhere.onDismissed!();

    await expect(pending).resolves.toEqual({ result: "dismissed" });
    expect(script.count).toBe(0);
  });

  // React strict mode double-renders, and a buyer can retry — neither should
  // inject the script twice.
  it("injects the script once for two concurrent attempts", async () => {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();

    const first = startPayHerePayment(instruction(), "EMP-1");
    const second = startPayHerePayment(instruction(), "EMP-1");

    expect(script.count).toBe(1);

    // Settle whichever attempt owns the handlers so neither promise is left
    // dangling past the end of the test.
    script.succeed();
    await flush();
    window.payhere!.onDismissed!();
    await expect(second).resolves.toEqual({ result: "dismissed" });
    void first;
  });

  // Worth knowing rather than fixing: the SDK dispatches through ONE set of
  // global handlers (sdk.onCompleted/onDismissed/onError), so a second attempt
  // started before the first settles overwrites the first's handlers and the
  // first promise never resolves at all. Harmless today — a buyer can only
  // work one popup — but it means startPayHerePayment must never be called
  // concurrently for two different orders, and it would strand the earlier
  // one silently if it ever were.
  it("lets the later attempt take the handlers, leaving the earlier one unsettled", async () => {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();

    let firstSettled = false;
    const first = startPayHerePayment(instruction(), "EMP-1").then((outcome) => {
      firstSettled = true;
      return outcome;
    });
    const second = startPayHerePayment(instruction(), "EMP-2");

    script.succeed();
    await flush();
    window.payhere!.onDismissed!();

    await expect(second).resolves.toEqual({ result: "dismissed" });
    await flush();
    expect(firstSettled).toBe(false);
    void first;
  });

  it("rejects with a reachability message when the script is blocked", async () => {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();

    const pending = startPayHerePayment(instruction(), "EMP-1");
    script.fail();

    await expect(pending).rejects.toThrow("Could not reach PayHere");
  });

  // Distinct from a network failure: something answered, but it wasn't the SDK.
  it("rejects when the script loads but installs no global", async () => {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();

    const pending = startPayHerePayment(instruction(), "EMP-1");
    script.succeedWithoutGlobal();

    await expect(pending).rejects.toThrow("PayHere loaded but did not initialise");
  });

  it("rejects rather than hanging when the script never fires either handler", async () => {
    vi.useFakeTimers();
    const { startPayHerePayment } = await freshModule();
    interceptScript();

    const pending = startPayHerePayment(instruction(), "EMP-1");
    const assertion = expect(pending).rejects.toThrow("PayHere took too long to load");
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
  });

  // A cached rejection would make the failure permanent for the session — the
  // buyer disables their ad blocker, retries, and still gets nothing.
  it("does not cache a failure, so a retry gets a fresh script", async () => {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();

    const first = startPayHerePayment(instruction(), "EMP-1");
    script.fail();
    await expect(first).rejects.toThrow();

    const second = startPayHerePayment(instruction(), "EMP-1");
    expect(script.count).toBe(2);

    script.succeed();
    await flush();
    window.payhere!.onDismissed!();
    await expect(second).resolves.toEqual({ result: "dismissed" });
  });
});

describe("payment outcomes", () => {
  /** Opens the popup and resolves once the SDK is wired up. */
  async function openPopup() {
    const { startPayHerePayment } = await freshModule();
    const script = interceptScript();
    const pending = startPayHerePayment(instruction(), "EMP-1");
    script.succeed();
    await flush();
    return { pending, sdk: window.payhere! };
  }

  it("resolves completed when the buyer finishes the flow", async () => {
    const { pending, sdk } = await openPopup();

    sdk.onCompleted!("PAYHERE-TXN-9");

    await expect(pending).resolves.toEqual({ result: "completed" });
  });

  // An abandoned payment is an ordinary outcome, not an error: the order keeps
  // its inventory hold and the buyer can try again.
  it("resolves dismissed when the buyer closes the popup", async () => {
    const { pending, sdk } = await openPopup();

    sdk.onDismissed!();

    await expect(pending).resolves.toEqual({ result: "dismissed" });
  });

  it("resolves error with PayHere's own message", async () => {
    const { pending, sdk } = await openPopup();

    sdk.onError!("Card declined");

    await expect(pending).resolves.toEqual({ result: "error", message: "Card declined" });
  });

  // PayHere fires both onError and onDismissed for a single failure; the
  // `settled` guard is what keeps the first answer.
  it("keeps the first outcome when PayHere fires two handlers for one failure", async () => {
    const { pending, sdk } = await openPopup();

    sdk.onError!("Card declined");
    sdk.onDismissed!();

    await expect(pending).resolves.toEqual({ result: "error", message: "Card declined" });
  });

  it("passes the signed fields through untouched, adding only the sandbox switch", async () => {
    const { sdk } = await openPopup();

    // sandbox is the SDK's estate switch — not a signed field, and the API
    // decides it so the two halves of one payment can't disagree.
    expect(sdk.startPayment).toHaveBeenCalledWith({
      merchant_id: "1234567",
      order_id: "EMP-1",
      hash: "A1B2C3",
      sandbox: true,
    });
  });
});
