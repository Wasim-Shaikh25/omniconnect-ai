import { env } from "@/shared/config";

function assertCrypto(): Crypto {
  const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  assertCrypto().getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export function buildCSP(nonce: string): string {
  const isDev = env.NODE_ENV === "development";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}
