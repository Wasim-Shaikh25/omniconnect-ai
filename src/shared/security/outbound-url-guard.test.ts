import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { LookupAddress } from "node:dns";

// Mock node:dns/promises to avoid real DNS lookups in tests
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

import { lookup } from "node:dns/promises";
import { assertPublicHttpUrl } from "./outbound-url-guard";

const mockLookup = vi.mocked(lookup);

function mockAddrs(addrs: { address: string; family: 4 | 6 }[]) {
  mockLookup.mockResolvedValue(addrs as unknown as LookupAddress);
}

describe("assertPublicHttpUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows a public HTTPS domain that resolves to a public IP", async () => {
    mockAddrs([{ address: "104.21.14.55", family: 4 }]);
    await expect(assertPublicHttpUrl("https://example.com/api")).resolves.toBeInstanceOf(URL);
  });

  it("allows a public HTTP domain", async () => {
    mockAddrs([{ address: "93.184.216.34", family: 4 }]);
    await expect(assertPublicHttpUrl("http://example.com")).resolves.toBeInstanceOf(URL);
  });

  it("rejects file: scheme", async () => {
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow("not allowed");
  });

  it("rejects ftp: scheme", async () => {
    await expect(assertPublicHttpUrl("ftp://example.com")).rejects.toThrow("not allowed");
  });

  it("rejects a malformed URL", async () => {
    await expect(assertPublicHttpUrl("not-a-url")).rejects.toThrow("Invalid URL");
  });

  it("rejects raw IPv4 loopback 127.0.0.1", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.1/secret")).rejects.toThrow("private/loopback");
  });

  it("rejects raw IPv4 loopback 127.0.0.2", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.2")).rejects.toThrow("private/loopback");
  });

  it("rejects RFC-1918 class A 10.x.x.x", async () => {
    await expect(assertPublicHttpUrl("http://10.0.0.1")).rejects.toThrow("private/loopback");
  });

  it("rejects RFC-1918 class B 172.16.x.x", async () => {
    await expect(assertPublicHttpUrl("http://172.16.0.1")).rejects.toThrow("private/loopback");
  });

  it("rejects RFC-1918 class B 172.31.x.x", async () => {
    await expect(assertPublicHttpUrl("http://172.31.255.255")).rejects.toThrow("private/loopback");
  });

  it("allows 172.32.x.x (not in private range)", async () => {
    // host is an IP literal, no DNS lookup is issued
    await expect(assertPublicHttpUrl("http://172.32.0.1")).resolves.toBeInstanceOf(URL);
  });

  it("rejects RFC-1918 class C 192.168.x.x", async () => {
    await expect(assertPublicHttpUrl("http://192.168.1.1")).rejects.toThrow("private/loopback");
  });

  it("rejects AWS IMDS 169.254.169.254", async () => {
    await expect(assertPublicHttpUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow("private/loopback");
  });

  it("rejects IPv6 loopback ::1", async () => {
    await expect(assertPublicHttpUrl("http://[::1]/secret")).rejects.toThrow("private/loopback");
  });

  it("rejects Fly.io 6PN fdaa:: prefix", async () => {
    await expect(assertPublicHttpUrl("http://[fdaa::1]/internal")).rejects.toThrow("private/loopback");
  });

  it("rejects ULA fc00::/7", async () => {
    await expect(assertPublicHttpUrl("http://[fc00::1]")).rejects.toThrow("private/loopback");
  });

  it("rejects link-local fe80::/10", async () => {
    await expect(assertPublicHttpUrl("http://[fe80::1]")).rejects.toThrow("private/loopback");
  });

  it("rejects a domain that resolves to a private IP", async () => {
    mockAddrs([{ address: "10.0.0.1", family: 4 }]);
    await expect(assertPublicHttpUrl("https://internal.example.com")).rejects.toThrow("private/loopback");
  });

  it("rejects a domain that has one public and one private IP", async () => {
    mockAddrs([
      { address: "104.21.14.55", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);
    await expect(assertPublicHttpUrl("https://mixed-dns.example.com")).rejects.toThrow("private/loopback");
  });
});
