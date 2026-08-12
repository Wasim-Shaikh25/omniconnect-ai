/**
 * Public routes that bypass the session check in the NextAuth middleware.
 * Keeping this in a separate file lets tests assert the list without loading NextAuth.
 */
const PUBLIC_PATHS_EXACT = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/pricing",
  "/api/health",
  "/api/ready",
  "/api/metrics",
  "/favicon.ico",
  "/manifest.webmanifest",
];

const PUBLIC_PATHS_PREFIX = [
  "/api/auth",
  "/_next",
  "/share",
  "/api/meta/webhook",
  "/api/razorpay/webhook",
  "/api/shopify/webhooks",
];

export const PUBLIC_PATHS = [...PUBLIC_PATHS_EXACT, ...PUBLIC_PATHS_PREFIX];

export function isPublicPath(pathname: string): boolean {
  const exactMatch = PUBLIC_PATHS_EXACT.includes(pathname);
  const prefixMatch = PUBLIC_PATHS_PREFIX.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  return exactMatch || prefixMatch;
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
