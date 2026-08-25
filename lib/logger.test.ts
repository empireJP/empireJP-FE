// The logger reads NEXT_PUBLIC_* at module scope, so each stage/level
// combination needs a fresh import with a different environment — hence
// vi.resetModules() and dynamic import throughout rather than a top-level one.
//
// The behaviour worth protecting is the fail-CLOSED rule: an unrecognised
// value for either variable must fall back to the QUIETEST sensible option,
// never the loudest. Failing open would mean one typo in a deploy config ships
// debug logging to every visitor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["NEXT_PUBLIC_APP_ENV", "NEXT_PUBLIC_LOG_LEVEL"] as const;
const snapshot: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) snapshot[key] = process.env[key];
  vi.resetModules();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
  vi.resetModules();
});

/** Imports the logger fresh under the given environment. */
async function loggerWith(env: { stage?: string; level?: string }) {
  for (const key of ENV_KEYS) delete process.env[key];
  if (env.stage !== undefined) process.env["NEXT_PUBLIC_APP_ENV"] = env.stage;
  if (env.level !== undefined) process.env["NEXT_PUBLIC_LOG_LEVEL"] = env.level;
  vi.resetModules();
  return import("./logger");
}

/**
 * Spies on every console method the logger writes through, THEN imports it.
 *
 * The order is load-bearing: logger.ts captures `console.debug.bind(console)`
 * into a lookup table at module scope, so a spy installed after the import is
 * never seen. Same reason the module has to be re-imported per environment.
 */
async function spiedLoggerWith(env: { stage?: string; level?: string }) {
  const spies = {
    debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
    warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
    trace: vi.spyOn(console, "trace").mockImplementation(() => {}),
  };
  const mod = await loggerWith(env);
  return { ...mod, spies };
}

describe("stage resolution", () => {
  it.each(["local", "dev", "prod"])("accepts the known stage %s", async (stage) => {
    const { logConfig } = await loggerWith({ stage });
    expect(logConfig.stage).toBe(stage);
  });

  it("defaults to local when the variable is unset", async () => {
    const { logConfig } = await loggerWith({});
    expect(logConfig.stage).toBe("local");
  });

  // The important one: "production" is a plausible typo for "prod", and
  // treating an unknown value as local would ship debug logs to real users.
  it("treats a set-but-unrecognised stage as prod, not local", async () => {
    const { logConfig } = await loggerWith({ stage: "production" });
    expect(logConfig.stage).toBe("prod");
    expect(logConfig.level).toBe("warn");
  });
});

describe("level resolution", () => {
  it.each([
    ["local", "debug"],
    ["dev", "debug"],
    ["prod", "warn"],
  ])("defaults %s to %s", async (stage, expected) => {
    const { logConfig } = await loggerWith({ stage });
    expect(logConfig.level).toBe(expected);
  });

  it("lets an explicit level override the stage default", async () => {
    const { logConfig } = await loggerWith({ stage: "prod", level: "trace" });
    expect(logConfig.level).toBe("trace");
  });

  it("accepts silent", async () => {
    const { logConfig } = await loggerWith({ stage: "local", level: "silent" });
    expect(logConfig.level).toBe("silent");
  });

  // Same fail-closed rule as the stage: an unrecognised level is ignored in
  // favour of the stage default, never treated as "log everything".
  it("ignores an unrecognised level and keeps the stage default", async () => {
    const { logConfig } = await loggerWith({ stage: "prod", level: "verbose" });
    expect(logConfig.level).toBe("warn");
  });
});

describe("level gating", () => {
  it("prod keeps warn and error, drops info and below", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "prod" });
    const log = createLogger("checkout");

    log.trace("t");
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    expect(spies.debug).not.toHaveBeenCalled();
    expect(spies.info).not.toHaveBeenCalled();
    expect(spies.warn).toHaveBeenCalledTimes(1);
    expect(spies.error).toHaveBeenCalledTimes(1);
  });

  it("local keeps debug and above but still drops trace", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });
    const log = createLogger("checkout");

    log.trace("t");
    log.debug("d");
    log.info("i");

    // trace and debug share console.debug, so a single call proves trace was
    // dropped and debug was not.
    expect(spies.debug).toHaveBeenCalledTimes(1);
    expect(spies.info).toHaveBeenCalledTimes(1);
  });

  it("silent emits nothing at all", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local", level: "silent" });
    const log = createLogger("checkout");

    log.trace("t");
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");

    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled();
  });

  it("routes trace to console.debug, not console.trace (which prints a stack)", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local", level: "trace" });

    createLogger("m").trace("t");

    expect(spies.debug).toHaveBeenCalledTimes(1);
    expect(spies.trace).not.toHaveBeenCalled();
  });
});

describe("message shape", () => {
  it("prefixes the module name", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });

    createLogger("checkout").warn("cart is empty");

    expect(spies.warn).toHaveBeenCalledWith("[checkout] cart is empty", {});
  });

  it("passes fields through as an inspectable object, not a string", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });

    createLogger("api").warn("failed", { status: 500 });

    expect(spies.warn).toHaveBeenCalledWith("[api] failed", { status: 500 });
  });

  // `createLogger` binds `emit(..., { ...base, ...fields })`, so it always
  // hands over an object — `{}` when there is neither. `emit`'s "no fields"
  // branch (`else CONSOLE[level](label)`) is therefore unreachable through the
  // public API, and every line carries a trailing `{}` in devtools. Harmless,
  // but pinned so the dead branch and the stray object are on the record.
  it("still passes an empty object when there are no fields", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });

    createLogger("api").warn("failed");

    expect(spies.warn).toHaveBeenCalledWith("[api] failed", {});
  });
});

describe("child loggers", () => {
  it("dots the child name onto the parent's", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });

    createLogger("checkout").child("tickets").warn("x");

    expect(spies.warn).toHaveBeenCalledWith("[checkout.tickets] x", {});
  });

  it("inherits the parent's base fields", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });

    createLogger("checkout", { orderCode: "EMP-1" }).child("tickets").warn("x");

    expect(spies.warn).toHaveBeenCalledWith("[checkout.tickets] x", { orderCode: "EMP-1" });
  });

  it("merges child fields over parent fields, and per-call fields over both", async () => {
    const { createLogger, spies } = await spiedLoggerWith({ stage: "local" });

    createLogger("m", { a: 1, b: 1 }).child("c", { b: 2 }).warn("x", { b: 3 });

    expect(spies.warn).toHaveBeenCalledWith("[m.c] x", { a: 1, b: 3 });
  });
});
