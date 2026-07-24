// better-auth client — talks to the BE's /api/auth namespace directly
// (its own request/response shapes, not the { data }/{ error } envelope).
// Session cookies are set by the API origin, so every call sends credentials.
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/** BE origin; /api/v1/* REST calls share it. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const authClient = createAuthClient({
  baseURL: API_URL, // basePath defaults to /api/auth, matching the BE mount
  plugins: [emailOTPClient()],
});
