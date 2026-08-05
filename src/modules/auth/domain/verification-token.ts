const TOKEN_BYTES = 32;
const SALT_BYTES = 16;

function getCrypto(): Crypto {
  const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

function encodeBase64Url(values: Uint8Array): string {
  return Buffer.from(values).toString("base64url");
}

export function generateVerificationToken(): string {
  const values = new Uint8Array(TOKEN_BYTES);
  getCrypto().getRandomValues(values);
  return encodeBase64Url(values);
}

export function generateVerificationSalt(): string {
  const values = new Uint8Array(SALT_BYTES);
  getCrypto().getRandomValues(values);
  return encodeBase64Url(values);
}

export async function hashVerificationToken(
  token: string,
  salt?: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt ? `${salt}:${token}` : token);
  const digest = await getCrypto().subtle.digest("SHA-256", data);
  return encodeBase64Url(new Uint8Array(digest));
}

export async function verifyVerificationToken(
  token: string,
  storedHash: string,
  salt?: string,
): Promise<boolean> {
  const computed = await hashVerificationToken(token, salt);
  return computed === storedHash;
}
