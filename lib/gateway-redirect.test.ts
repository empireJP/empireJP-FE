// The redirect-style launcher (KOMOJU today). Two shapes: plain navigation
// when the session already carries everything, and a hidden auto-submitting
// form when the gateway wants signed fields POSTed.
//
// The rule with teeth is that field values reach the form EXACTLY as the API
// signed them — any normalisation here invalidates the gateway's hash and the
// payment is rejected at the other end.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { startRedirectPayment } from "./gateway-redirect";
import type { PaymentInstruction } from "./types";

function instruction(over: Partial<PaymentInstruction> = {}): PaymentInstruction {
  return {
    kind: "redirect",
    actionUrl: "https://komoju.com/sessions/abc123",
    fields: {},
    sandbox: true,
    ...over,
  } as PaymentInstruction;
}

let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.body.innerHTML = "";
  assign = vi.fn();
  // jsdom's window.location is not writable, so the navigation call is
  // replaced rather than the whole object.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign, href: "http://localhost:3000/checkout/payment" },
  });
  // A real submit() would try to navigate and warn "not implemented".
  HTMLFormElement.prototype.submit = vi.fn();
});

describe("with no fields (KOMOJU — the session carries everything)", () => {
  it("navigates straight to the gateway", () => {
    startRedirectPayment(instruction(), "EMP-1");

    expect(assign).toHaveBeenCalledWith("https://komoju.com/sessions/abc123");
  });

  it("builds no form at all", () => {
    startRedirectPayment(instruction(), "EMP-1");

    expect(document.querySelector("form")).toBeNull();
  });
});

describe("with signed fields (gateways that want a POST)", () => {
  const fields = {
    merchant_id: "1234567",
    order_id: "EMP-1",
    amount: "4500.00",
    hash: "A1B2C3",
  };

  it("POSTs a form to the gateway's action URL", () => {
    startRedirectPayment(instruction({ fields }), "EMP-1");

    const form = document.querySelector("form")!;
    expect(form.method).toBe("post");
    expect(form.action).toBe("https://komoju.com/sessions/abc123");
    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledTimes(1);
  });

  it("carries every field as a hidden input, byte-for-byte as signed", () => {
    startRedirectPayment(instruction({ fields }), "EMP-1");

    const inputs = [...document.querySelectorAll<HTMLInputElement>("form input")];
    expect(inputs).toHaveLength(4);
    expect(Object.fromEntries(inputs.map((i) => [i.name, i.value]))).toEqual(fields);
    expect(inputs.every((i) => i.type === "hidden")).toBe(true);
  });

  // A signed value can legitimately contain anything; trimming or re-encoding
  // it would break the gateway's hash check.
  it("does not normalise values that look like they need it", () => {
    const awkward = {
      note: "  leading and trailing  ",
      symbols: "a+b/c=d&e",
      unicode: "コンサート",
      empty: "",
    };
    startRedirectPayment(instruction({ fields: awkward }), "EMP-1");

    const inputs = [...document.querySelectorAll<HTMLInputElement>("form input")];
    expect(Object.fromEntries(inputs.map((i) => [i.name, i.value]))).toEqual(awkward);
  });

  it("keeps the form out of sight and does not navigate directly", () => {
    startRedirectPayment(instruction({ fields }), "EMP-1");

    expect(document.querySelector<HTMLFormElement>("form")!.style.display).toBe("none");
    expect(assign).not.toHaveBeenCalled();
  });
});
