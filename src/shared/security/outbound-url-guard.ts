const BLOCKED_V4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^255\./,
];

// Very permissive — only used to detect IP literals, not to validate them
const IPV4_LITERAL = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function isIPv4Literal(host: string): boolean {
  return IPV4_LITERAL.test(host);
}

function isIPv6Literal(host: string): boolean {
  // IPv6 literals contain colons and no dots (after bracket stripping)
  return host.includes(":") && !host.includes("/");
}

function isBlockedV4(address: string): boolean {
  return BLOCKED_V4_PATTERNS.some((re) => re.test(address));
}

function isBlockedV6(address: string): boolean {
  const lower = address.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80") ||
    lower === "::"
  );
}

/**
 * Resolves `raw` as a URL and verifies it does not target a private,
 * loopback, or link-local address. Throws if the URL is disallowed.
 * Only http: and https: schemes are permitted.
 *
 * On the server: performs DNS resolution to block domain names that resolve
 * to private addresses (DNS rebinding protection).
 * On the client: IP-literal checks only (DNS not available).
 */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Scheme '${url.protocol}' is not allowed; only http and https are permitted`);
  }

  // url.hostname retains brackets for IPv6 literals, e.g. "[::1]" → strip them
  const rawHost = url.hostname;
  const host = rawHost.startsWith("[") && rawHost.endsWith("]")
    ? rawHost.slice(1, -1)
    : rawHost;

  if (isIPv4Literal(host)) {
    if (isBlockedV4(host)) {
      throw new Error(`Refusing to connect to private/loopback IPv4 address: ${host}`);
    }
    return url;
  }

  if (isIPv6Literal(host)) {
    if (isBlockedV6(host)) {
      throw new Error(`Refusing to connect to private/loopback IPv6 address: ${host}`);
    }
    return url;
  }

  // host is a domain name — resolve and check each address (server-side only).
  // webpackIgnore prevents the bundler from trying to resolve the node: URI
  // in the client chunk (this code path is never reached client-side).
  if (typeof process !== "undefined" && process.versions?.node) {
    const { lookup } = await import(/* webpackIgnore: true */ "node:dns/promises");
    const addrs = await lookup(host, { all: true });
    for (const { address, family } of addrs) {
      if (family === 4 && isBlockedV4(address)) {
        throw new Error(`Refusing to connect: ${host} resolves to private/loopback IPv4 address ${address}`);
      }
      if (family === 6 && isBlockedV6(address)) {
        throw new Error(`Refusing to connect: ${host} resolves to private/loopback IPv6 address ${address}`);
      }
    }
  }

  return url;
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function sanitizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const sanitized: Record<string, string> = {};
  if (!headers) return sanitized;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      sanitized[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      sanitized[key] = value;
    }
  } else {
    Object.assign(sanitized, headers);
  }
  return sanitized;
}

function stripAuthHeaders(headers: Record<string, string>): Record<string, string> {
  const copy = { ...headers };
  for (const key of Object.keys(copy)) {
    const lower = key.toLowerCase();
    if (lower === "authorization" || lower === "cookie") {
      delete copy[key];
    }
  }
  return copy;
}

/**
 * Fetches `url` while manually following redirects. Every URL in the chain,
 * including `Location` values that are relative or contain internationalized
 * domain names, is validated by `assertPublicHttpUrl` before the next request
 * is issued. This closes the SSRF gap left by native `fetch`, which follows
 * redirects to private/loopback networks by default.
 */
export async function fetchWithPublicRedirects(
  url: string,
  init: RequestInit = {},
  maxRedirects = 5,
): Promise<Response> {
  let currentUrl = url;
  let currentInit: RequestInit = { ...init, redirect: "manual" };

  for (let step = 0; step <= maxRedirects; step++) {
    await assertPublicHttpUrl(currentUrl);

    const response = await fetch(currentUrl, currentInit);
    if (!isRedirectStatus(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect from ${currentUrl} is missing a Location header`);
    }

    const nextUrl = new URL(location, currentUrl).href;
    const next = new URL(nextUrl);
    const current = new URL(currentUrl);

    const crossOrigin = next.origin !== current.origin;
    const preserveMethod = response.status === 307 || response.status === 308;

    const nextInit: RequestInit = { ...currentInit, redirect: "manual" };
    if (!preserveMethod) {
      nextInit.method = "GET";
      nextInit.body = undefined;
    }
    if (crossOrigin) {
      nextInit.headers = stripAuthHeaders(sanitizeHeaders(nextInit.headers));
    }

    currentUrl = nextUrl;
    currentInit = nextInit;
  }

  throw new Error(`Too many redirects from ${url}`);
}
