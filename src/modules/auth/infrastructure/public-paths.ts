/**
 * Public routes that bypass the session check in the NextAuth middleware.
 * Keeping this in a separate file lets tests assert the list without loading NextAuth.
 */
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/api/auth",
  "/api/meta/webhook",
  "/api/stripe/webhook",
  "/api/shopify/webhooks",
  "/api/health",
  "/api/ready",
  "/_next",
  "/favicon.ico",
  "/manifest.webmanifest",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type RouteAuthorization =
  | { kind: "allow" }
  | { kind: "redirect"; location: string };

/**
 * Pure middleware authorization decision. Returns the redirect target for anonymous
 * requests to non-public routes (the caller turns this into a 307 response).
 */
export function authorizeRoute(
  pathname: string,
  isAuthenticated: boolean,
): RouteAuthorization {
  if (isPublicPath(pathname)) {
    return { kind: "allow" };
  }
  if (isAuthenticated) {
    return { kind: "allow" };
  }
  const login = new URL("/login", "http://localhost");
  login.searchParams.set("callbackUrl", pathname);
  return { kind: "redirect", location: login.toString().replace("http://localhost", "") };
}
