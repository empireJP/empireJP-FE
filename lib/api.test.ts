// The API client's error handling, which is the part with teeth: `fetch` does
// NOT reject on 4xx (a 422 resolves), so every non-OK path here is hand-rolled
// and a regression would surface as a silently-discarded write rather than an
// exception. CLIENT_VALIDATION_AUDIT.md records exactly that having happened.
//
// `fetch` is stubbed per test — no network, and no shared default response, so
// a test that forgets to stub fails loudly.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  confirmMockOrder,
  createOrder,
  getEvent,
  getEvents,
  getOrder,
  getPaymentMethods,
  getSavedEvents,
  validateCoupon,
} from "./api";

/** A Response-alike carrying whatever body/status the test needs. */
function respond(
  body: unknown,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {}
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The URL the last fetch call was made against. */
function lastUrl(): string {
  return String(fetchMock.mock.calls.at(-1)![0]);
}

function lastInit(): RequestInit {
  return fetchMock.mock.calls.at(-1)![1] as RequestInit;
}

describe("error handling", () => {
  // The headline case: a 422 resolves, so this must be turned into a throw by
  // hand or the caller treats a rejected write as a success.
  it("throws ApiError on a 4xx that resolves rather than rejecting", async () => {
    fetchMock.mockResolvedValue(
      respond({ error: { code: "VALIDATION_ERROR", message: "Invalid request" } }, { status: 422 })
    );

    await expect(getEvents()).rejects.toBeInstanceOf(ApiError);
  });

  it("carries the API's status, code and message onto the error", async () => {
    fetchMock.mockResolvedValue(
      respond({ error: { code: "COUPON_EXPIRED", message: "That code has expired." } }, { status: 422 })
    );

    // The caller shows `message` verbatim, so it must survive intact.
    await expect(
      validateCoupon({ code: "OLD", eventSlug: "e", lines: [] })
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      code: "COUPON_EXPIRED",
      message: "That code has expired.",
    });
  });

  it("throws when the response is not ok and carries no error envelope", async () => {
    fetchMock.mockResolvedValue(respond(null, { status: 500 }));

    await expect(getEvents()).rejects.toThrow("API 500 on /events");
  });

  // A 200 whose body is missing `data` is unusable — treating it as success
  // would hand callers `undefined` and fail somewhere further away.
  it("throws on a 200 with no data field", async () => {
    fetchMock.mockResolvedValue(respond({ meta: {} }, { status: 200 }));

    await expect(getEvents()).rejects.toThrow("API 200 on /events");
  });

  it("throws on a 200 whose body is not JSON at all", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    } as unknown as Response);

    await expect(getEvents()).rejects.toThrow("API 200 on /events");
  });

  // The CORS case: the browser surfaces it as an indistinguishable
  // "Failed to fetch" before any response exists.
  it("rethrows a transport failure (offline, DNS, CORS)", async () => {
    const boom = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(boom);

    await expect(getEvents()).rejects.toBe(boom);
  });
});

describe("getEvents", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(
      respond({ data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 0 } })
    );
  });

  it("requests /events with no query string when given no params", async () => {
    await getEvents();
    expect(lastUrl()).toMatch(/\/api\/v1\/events$/);
  });

  it("serializes params, including booleans and numbers", async () => {
    await getEvents({ category: "Techno" as never, upcoming: true, page: 2, limit: 24 });

    const url = new URL(lastUrl());
    expect(url.searchParams.get("category")).toBe("Techno");
    expect(url.searchParams.get("upcoming")).toBe("true");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("24");
  });

  // `upcoming: false` means "already over" — dropping it because it is falsy
  // would silently turn a past-events view into an all-events one.
  it("keeps upcoming=false rather than dropping it as falsy", async () => {
    await getEvents({ upcoming: false });
    expect(new URL(lastUrl()).searchParams.get("upcoming")).toBe("false");
  });

  it("omits undefined params entirely", async () => {
    await getEvents({ q: undefined, page: 1 });
    const url = new URL(lastUrl());
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("page")).toBe("1");
  });

  it("returns events alongside the pagination meta", async () => {
    fetchMock.mockResolvedValue(
      respond({ data: [{ slug: "a" }], meta: { page: 1, limit: 12, total: 1, totalPages: 1 } })
    );

    const { events, meta } = await getEvents();
    expect(events).toHaveLength(1);
    expect(meta.total).toBe(1);
  });

  it("sends no credentials — the catalog is public", async () => {
    await getEvents();
    expect(lastInit().credentials).toBeUndefined();
  });
});

describe("getEvent", () => {
  // Pages call notFound() on undefined; turning a 404 into a throw would make
  // a renamed event a 500 instead of a 404.
  it("returns undefined for a 404 rather than throwing", async () => {
    fetchMock.mockResolvedValue(
      respond({ error: { code: "NOT_FOUND", message: "No such event" } }, { status: 404 })
    );

    await expect(getEvent("gone")).resolves.toBeUndefined();
  });

  it("still throws for any other error status", async () => {
    fetchMock.mockResolvedValue(
      respond({ error: { code: "INTERNAL", message: "boom" } }, { status: 500 })
    );

    await expect(getEvent("x")).rejects.toBeInstanceOf(ApiError);
  });

  it("url-encodes the slug", async () => {
    fetchMock.mockResolvedValue(respond({ data: { slug: "a b" } }));

    await getEvent("a b/c");
    expect(lastUrl()).toContain("/events/a%20b%2Fc");
  });
});

describe("authenticated reads", () => {
  it("getSavedEvents attaches the session cookie", async () => {
    fetchMock.mockResolvedValue(respond({ data: [] }));

    await getSavedEvents();
    expect(lastInit().credentials).toBe("include");
  });

  it("getOrder attaches credentials and url-encodes the code", async () => {
    fetchMock.mockResolvedValue(respond({ data: { code: "EMP-1" } }));

    await getOrder("EMP/1");
    expect(lastUrl()).toContain("/orders/EMP%2F1");
    expect(lastInit().credentials).toBe("include");
  });

  // A guest reads their own order by code + email; the code alone is short and
  // human-readable, so the API deliberately requires both.
  it("getOrder passes the buyer email when given one", async () => {
    fetchMock.mockResolvedValue(respond({ data: { code: "EMP-1" } }));

    await getOrder("EMP-1", "buyer+tag@test.dev");
    expect(new URL(lastUrl()).searchParams.get("email")).toBe("buyer+tag@test.dev");
  });

  it("getOrder omits the email parameter when not given one", async () => {
    fetchMock.mockResolvedValue(respond({ data: { code: "EMP-1" } }));

    await getOrder("EMP-1");
    expect(lastUrl()).not.toContain("email=");
  });
});

describe("getPaymentMethods", () => {
  it("narrows by currency when one is given", async () => {
    fetchMock.mockResolvedValue(respond({ data: [] }));

    await getPaymentMethods("JPY");
    expect(new URL(lastUrl()).searchParams.get("currency")).toBe("JPY");
  });

  it("asks for everything configured when no currency is given", async () => {
    fetchMock.mockResolvedValue(respond({ data: [] }));

    await getPaymentMethods();
    expect(lastUrl()).toMatch(/\/payments\/methods$/);
  });

  // A pricing currency whose gateway isn't signed yet — the payment step
  // renders this as an explanation, so it must not be an error.
  it("treats an empty list as a legitimate answer", async () => {
    fetchMock.mockResolvedValue(respond({ data: [] }));

    await expect(getPaymentMethods("CHF")).resolves.toEqual([]);
  });
});

describe("createOrder", () => {
  const input = {
    eventSlug: "neon-nights",
    lines: [{ tierId: "t1", qty: 2 }],
    buyer: { name: "Ada", email: "ada@test.dev" },
    paymentProvider: "payhere" as never,
  };

  beforeEach(() => {
    fetchMock.mockResolvedValue(respond({ data: { code: "EMP-1", status: "PENDING" } }));
  });

  it("POSTs JSON with the session attached", async () => {
    await createOrder(input);

    const init = lastInit();
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  // Money is computed server-side from the catalog; a price in the request
  // body would be an input to the charge, which is exactly what must not exist.
  it("sends only tier ids and quantities — never prices", async () => {
    await createOrder(input);

    const body = JSON.parse(String(lastInit().body));
    expect(body.lines).toEqual([{ tierId: "t1", qty: 2 }]);
    expect(JSON.stringify(body)).not.toMatch(/price|total|amount|cents/i);
  });
});

describe("confirmMockOrder", () => {
  it("POSTs to the dev-only confirm-mock route with the code encoded", async () => {
    fetchMock.mockResolvedValue(respond({ data: { accepted: true } }, { status: 202 }));

    await confirmMockOrder("EMP/1");
    expect(lastUrl()).toContain("/orders/EMP%2F1/confirm-mock");
    expect(lastInit().method).toBe("POST");
  });
});
