import { describe, it, expect } from "vitest";
import { isPublicPath, PUBLIC_PATHS, authorizeRoute } from "./public-paths";

describe("publicPaths (M13 / M14)", () => {
  it("does not treat /help or /support as public", () => {
    expect(isPublicPath("/help")).toBe(false);
    expect(isPublicPath("/support")).toBe(false);
    expect(PUBLIC_PATHS).not.toContain("/help");
    expect(PUBLIC_PATHS).not.toContain("/support");
  });

  it("redirects anonymous /help and /support to /login with callbackUrl (M13 / M14)", () => {
    const help = authorizeRoute("/help", false);
    expect(help.kind).toBe("redirect");
    expect(help).toEqual({ kind: "redirect", location: "/login?callbackUrl=%2Fhelp" });

    const support = authorizeRoute("/support", false);
    expect(support.kind).toBe("redirect");
    expect(support).toEqual({ kind: "redirect", location: "/login?callbackUrl=%2Fsupport" });
  });

  it("allows authenticated requests to /help and /support", () => {
    expect(authorizeRoute("/help", true)).toEqual({ kind: "allow" });
    expect(authorizeRoute("/support", true)).toEqual({ kind: "allow" });
  });

  it("keeps authentication and marketing pages public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/register")).toBe(true);
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/reset-password")).toBe(true);
    expect(isPublicPath("/pricing")).toBe(true);
    expect(authorizeRoute("/pricing", false)).toEqual({ kind: "allow" });
  });

  it("keeps webhook and static paths public", () => {
    expect(isPublicPath("/api/shopify/webhooks")).toBe(true);
    expect(isPublicPath("/api/meta/webhook")).toBe(true);
    expect(isPublicPath("/api/razorpay/webhook")).toBe(true);
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/api/ready")).toBe(true);
    expect(isPublicPath("/manifest.webmanifest")).toBe(true);
  });

  it("keeps /api/metrics reachable for unauthenticated Prometheus scrapers (bearer auth enforced at route handler)", () => {
    expect(isPublicPath("/api/metrics")).toBe(true);
    expect(authorizeRoute("/api/metrics", false)).toEqual({ kind: "allow" });
  });
});
