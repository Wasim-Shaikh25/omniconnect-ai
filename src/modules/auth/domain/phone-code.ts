import { isE164Phone } from "./phone";

export { isE164Phone };

const CODE_MIN = 100000;
const CODE_MAX = 999999;

function getWebCrypto(): Crypto {
  const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (!globalCrypto?.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  return globalCrypto;
}

export function generatePhoneCode(): string {
  const values = new Uint32Array(1);
  getWebCrypto().getRandomValues(values);
  const code = (values[0] % (CODE_MAX - CODE_MIN + 1)) + CODE_MIN;
  return code.toString();
}

export function normalizePhone(value: string): string {
  return value.trim();
}
