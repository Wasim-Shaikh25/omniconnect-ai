const TOKEN_BYTES = 32;

function getCrypto(): Crypto {
  const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

export function generateVerificationToken(): string {
  const values = new Uint8Array(TOKEN_BYTES);
  getCrypto().getRandomValues(values);
  return Buffer.from(values).toString("base64url");
}

export async function hashVerificationToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const digest = await getCrypto().subtle.digest("SHA-256", data);
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}
