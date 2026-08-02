// Launches a redirect-style payment instruction (kind: "redirect") — the
// buyer LEAVES this site for the gateway's hosted page (KOMOJU today) and
// comes back to /checkout/confirmation via the return URL baked into the
// session server-side.
//
// Contrast lib/payhere.ts, which keeps the buyer here in a popup. The two
// share the same trust rule: nothing about the navigation proves payment —
// the confirmation page polls the order until the gateway's webhook flips it.
//
// This function never resolves on the success path: the page unloads.
import type { PaymentInstruction } from "./types";
import { createLogger } from "./logger";

const log = createLogger("gateway-redirect");

export function startRedirectPayment(instruction: PaymentInstruction, orderCode: string): void {
  // The last client-side line before the gateway takes over — the line that
  // dates a payment attempt when a buyer reports never coming back.
  log.info("redirecting to the gateway's hosted page", {
    orderCode,
    sandbox: instruction.sandbox,
  });

  if (Object.keys(instruction.fields).length === 0) {
    // The session already carries everything (KOMOJU) — plain navigation.
    window.location.assign(instruction.actionUrl);
    return;
  }

  // Gateways that want the signed fields POSTed as a form: build one and
  // submit it. Values go through exactly as signed — see PaymentInstruction.
  const form = document.createElement("form");
  form.method = "POST";
  form.action = instruction.actionUrl;
  form.style.display = "none";
  for (const [name, value] of Object.entries(instruction.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
