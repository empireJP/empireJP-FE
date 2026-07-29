// Frontend logging. Deliberately dependency-free: a browser logger's job here
// is to be filterable and to disappear in production, and a level-gated
// wrapper over `console` does both without shipping a logging library to every
// visitor. If logs ever need to be *collected* from the browser rather than
// read in devtools, replace the `emit` function below — nothing else changes.
//
//   import { createLogger } from "@/lib/logger";
//   const log = createLogger("checkout");
//   log.warn("event failed to resolve", { slug, status });
//
// Two knobs, both build-time (Next inlines NEXT_PUBLIC_* at build, so a
// deployed bundle carries the values of the build that produced it):
//   NEXT_PUBLIC_APP_ENV    local | dev | prod   — stage, also stamped on lines
//   NEXT_PUBLIC_LOG_LEVEL  trace…error | silent — overrides the stage default
//
// Argument order is (message, fields) — the reverse of the BE's pino calls.
// It matches how `console` reads in devtools, where these actually land.
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";
export type AppStage = "local" | "dev" | "prod";

const STAGE: AppStage = (process.env.NEXT_PUBLIC_APP_ENV as AppStage) || "local";

const RANK: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
};

/** prod keeps warnings and errors only — anything below is noise in a user's
 *  console and, server-side, in the platform's log bill. */
const DEFAULT_LEVEL: Record<AppStage, LogLevel> = {
  local: "debug",
  dev: "debug",
  prod: "warn",
};

const LEVEL: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || DEFAULT_LEVEL[STAGE] || "debug";

const THRESHOLD = RANK[LEVEL] ?? RANK.debug;

/** Next runs the same modules in two places; which one decides the format. */
const onServer = typeof window === "undefined";

export interface Fields {
  [key: string]: unknown;
}

export interface Logger {
  trace(msg: string, fields?: Fields): void;
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
  /** Narrower scope under the same module, e.g. createLogger("checkout").child("tickets"). */
  child(name: string, fields?: Fields): Logger;
}

type EmitLevel = Exclude<LogLevel, "silent">;

// Bound because some browsers lose the console binding when the method is
// stored on its own. trace maps to console.debug: console.trace prints a
// stack trace, which is not what a trace-level line means here.
const CONSOLE: Record<EmitLevel, (...args: unknown[]) => void> = {
  trace: console.debug.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function emit(level: EmitLevel, module: string, msg: string, fields?: Fields) {
  if (RANK[level] < THRESHOLD) return;

  // Server-side on a deployed stage the line goes to the platform's log
  // collector, which wants one JSON object — the same shape the BE emits, so
  // both halves of a request can be read in one stream.
  if (onServer && STAGE !== "local") {
    CONSOLE[level](
      JSON.stringify({
        level,
        time: new Date().toISOString(),
        env: STAGE,
        service: "buyer-fe",
        module,
        msg,
        ...fields,
      }),
    );
    return;
  }

  // Anywhere else a human is reading it: keep the object inspectable rather
  // than stringified.
  const label = `[${module}] ${msg}`;
  if (fields) CONSOLE[level](label, fields);
  else CONSOLE[level](label);
}

export function createLogger(module: string, base: Fields = {}): Logger {
  const bind = (level: EmitLevel) => (msg: string, fields?: Fields) =>
    emit(level, module, msg, { ...base, ...fields });

  return {
    trace: bind("trace"),
    debug: bind("debug"),
    info: bind("info"),
    warn: bind("warn"),
    error: bind("error"),
    child: (name, fields = {}) => createLogger(`${module}.${name}`, { ...base, ...fields }),
  };
}

/** For one-off lines that don't belong to a module yet. Prefer createLogger. */
export const logger = createLogger("app");

/** What the runtime settled on — logged once at boot so a confusing silence
 *  in a deployed environment is one line away from being explained. */
export const logConfig = { stage: STAGE, level: LEVEL } as const;
