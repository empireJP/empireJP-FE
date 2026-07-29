// PayHere's on-site checkout popup.
//
// PayHere ships a small script that opens a modal over the current page, so
// the buyer never leaves the site. The script is loaded from PayHere's own
// domain — it has to be, it is the thing that talks to them — and the URL is
// supplied by our API alongside the signed fields, so sandbox and live can
// never drift apart between the two halves of one payment.
//
// The important thing about this file is what it does NOT do: `onCompleted`
// is not proof of payment. It fires in the buyer's browser, so it can be
// forged, suppressed by a closed tab, or arrive before PayHere has told our
// server anything. It is treated purely as "stop waiting and go look" — the
// order only becomes PAID when PayHere's server-to-server callback reaches our
// webhook receiver. Callers poll the order after this resolves.
import type { PaymentInstruction } from "./types";
import { createLogger } from "./logger";

const log = createLogger("payhere");

/** The global the SDK installs. Only the members we use are typed. */
interface PayHereSdk {
  startPayment(payment: Record<string, string>): void;
  onCompleted?: (orderId: string) => void;
  onDismissed?: () => void;
  onError?: (message: string) => void;
}

declare global {
  interface Window {
    payhere?: PayHereSdk;
  }
}

/** In-flight/settled loads, keyed by URL, so two payment attempts (or a React
 *  strict-mode double render) don't inject the script twice. */
const loads = new Map<string, Promise<PayHereSdk>>();

const LOAD_TIMEOUT_MS = 15_000;

/**
 * Loads the PayHere SDK once and resolves with its global.
 *
 * Rejects rather than hanging if the script is blocked — an ad blocker or a
 * strict CSP swallowing it is a realistic failure here, and one that would
 * otherwise present as a Pay button that does nothing at all.
 */
function loadSdk(sdkUrl: string): Promise<PayHereSdk> {
  const existing = loads.get(sdkUrl);
  if (existing) return existing;

  const promise = new Promise<PayHereSdk>((resolve, reject) => {
    if (window.payhere) {
      resolve(window.payhere);
      return;
    }
    const script = document.createElement("script");
    script.src = sdkUrl;
    script.async = true;

    const timer = window.setTimeout(() => {
      log.error("payhere sdk load timed out", { sdkUrl, timeoutMs: LOAD_TIMEOUT_MS });
      // Drop the cached rejection so a retry gets a fresh attempt rather than
      // replaying this failure forever.
      loads.delete(sdkUrl);
      reject(new Error("PayHere took too long to load"));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timer);
      if (!window.payhere) {
        // Loaded but installed nothing: a proxy or captive portal served
        // something else at that URL. Distinct from a network failure, and
        // silent without this line.
        log.error("payhere sdk loaded but installed no global", { sdkUrl });
        loads.delete(sdkUrl);
        reject(new Error("PayHere loaded but did not initialise"));
        return;
      }
      log.debug("payhere sdk ready", { sdkUrl });
      resolve(window.payhere);
    };

    script.onerror = () => {
      window.clearTimeout(timer);
      // Almost always an ad blocker or an offline browser. The buyer sees a
      // dead button; this is the only record of why.
      log.error("payhere sdk failed to load — blocked or offline?", { sdkUrl });
      loads.delete(sdkUrl);
      reject(new Error("Could not reach PayHere"));
    };

    document.head.appendChild(script);
  });

  loads.set(sdkUrl, promise);
  return promise;
}

export type PayHereOutcome =
  /** The buyer finished the PayHere flow. NOT a guarantee of payment — poll. */
  | { result: "completed" }
  /** The buyer closed the popup. No charge, and the order can be retried. */
  | { result: "dismissed" }
  /** PayHere itself reported a problem with the payment attempt. */
  | { result: "error"; message: string };

/**
 * Opens the PayHere popup for an order and resolves once the buyer is done
 * with it, one way or another.
 *
 * Rejects only if the popup could not be opened at all (SDK blocked, or the
 * API handed us a redirect-style instruction we can't run here). A payment the
 * buyer abandoned is an ordinary "dismissed" outcome, not an error — the order
 * keeps its inventory hold and they can try again.
 */
export async function startPayHerePayment(
  instruction: PaymentInstruction,
  orderCode: string,
): Promise<PayHereOutcome> {
  if (!instruction.sdkUrl) {
    // The API describes the integration; if it ever switches this order to a
    // redirect flow, failing here is better than silently doing nothing.
    log.error("payment instruction has no sdkUrl — cannot open the popup", {
      orderCode,
      kind: instruction.kind,
    });
    throw new Error("This payment method needs a page reload to continue");
  }

  const sdk = await loadSdk(instruction.sdkUrl);

  return new Promise<PayHereOutcome>((resolve) => {
    // The SDK dispatches through single global handlers rather than
    // per-invocation callbacks, so they're reassigned per attempt and each
    // resolves exactly once. `settled` guards the case where PayHere fires
    // both onError and onDismissed for one failure.
    let settled = false;
    const settle = (outcome: PayHereOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    sdk.onCompleted = (gatewayOrderId: string) => {
      // Deliberately logged at info: this is the last thing we see on the
      // client before the answer arrives out of band on the server, and it is
      // the line that dates a payment attempt when a buyer reports a problem.
      log.info("payhere popup completed — polling for the confirmed order", {
        orderCode,
        gatewayOrderId,
      });
      settle({ result: "completed" });
    };

    sdk.onDismissed = () => {
      log.debug("payhere popup dismissed by the buyer", { orderCode });
      settle({ result: "dismissed" });
    };

    sdk.onError = (message: string) => {
      log.error("payhere reported a payment error", { orderCode, cause: message });
      settle({ result: "error", message });
    };

    log.debug("opening payhere popup", { orderCode, sandbox: instruction.sandbox });
    // Fields are passed through exactly as the API signed them — reordering is
    // harmless but editing any value invalidates the hash.
    sdk.startPayment(instruction.fields);
  });
}
