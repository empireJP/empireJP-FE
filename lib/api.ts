// Typed fetchers for the public catalog API. Works in server and client
// components alike (plain fetch + a NEXT_PUBLIC_ var). The BE serves the FE
// mock shapes verbatim, so responses are EventItem with no field mapping.
import type { Category, City, EventItem } from "./types";
import { createLogger } from "./logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const log = createLogger("api");

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: PageMeta }> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      cache: "no-store",
      ...init,
    });
  } catch (err) {
    // The API being down, DNS, or — the one that cost us an afternoon — a CORS
    // rejection, which reaches JS as an indistinguishable "Failed to fetch".
    // Callers turn this into an empty state, so without this line the failure
    // leaves no trace anywhere.
    log.error("request failed before a response", {
      path,
      url: `${API_URL}/api/v1${path}`,
      durationMs: Date.now() - started,
      cause: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const body = await res.json().catch(() => null);
  // The BE echoes the id it logged the request under; carrying it here is what
  // lets one line in the browser be matched to the server's side of the story.
  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (body?.error) {
    // 404s are routine (a hidden or renamed event) and callers handle them;
    // everything else is worth a warning.
    const level = res.status === 404 ? "debug" : "warn";
    log[level]("api returned an error", {
      path,
      status: res.status,
      code: body.error.code,
      requestId,
      durationMs: Date.now() - started,
    });
    throw new ApiError(res.status, body.error.code, body.error.message);
  }
  if (!res.ok || body?.data === undefined) {
    log.error("api returned an unusable response", {
      path,
      status: res.status,
      requestId,
      durationMs: Date.now() - started,
    });
    throw new Error(`API ${res.status} on ${path}`);
  }

  log.trace("api ok", { path, status: res.status, requestId, durationMs: Date.now() - started });
  return body;
}

export interface EventsQuery {
  category?: Category;
  city?: City;
  q?: string;
  featured?: boolean;
  sort?: "date" | "trending";
  page?: number;
  limit?: number;
}

export async function getEvents(
  params: EventsQuery = {},
): Promise<{ events: EventItem[]; meta: PageMeta }> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const query = qs.toString();
  const { data, meta } = await apiFetch<EventItem[]>(
    `/events${query ? `?${query}` : ""}`,
  );
  return { events: data, meta: meta! };
}

/** Signed-in user's saved events, newest save first. Requires a session. */
export async function getSavedEvents(): Promise<EventItem[]> {
  const { data } = await apiFetch<EventItem[]>("/me/saved-events", {
    credentials: "include",
  });
  return data;
}

/** Returns undefined on 404 so pages can call notFound(); throws otherwise. */
export async function getEvent(slug: string): Promise<EventItem | undefined> {
  try {
    const { data } = await apiFetch<EventItem>(
      `/events/${encodeURIComponent(slug)}`,
    );
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}
