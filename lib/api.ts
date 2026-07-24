// Typed fetchers for the public catalog API. Works in server and client
// components alike (plain fetch + a NEXT_PUBLIC_ var). The BE serves the FE
// mock shapes verbatim, so responses are EventItem with no field mapping.
import type { Category, City, EventItem } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    cache: "no-store",
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (body?.error) {
    throw new ApiError(res.status, body.error.code, body.error.message);
  }
  if (!res.ok || body?.data === undefined) {
    throw new Error(`API ${res.status} on ${path}`);
  }
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
