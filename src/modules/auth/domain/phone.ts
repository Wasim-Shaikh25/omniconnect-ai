const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function isE164Phone(value: string): boolean {
  return E164_REGEX.test(value);
}
