export const SUPPORT_KEYWORDS = [
  "return",
  "refund",
  "broken",
  "issue",
  "complaint",
  "support",
  "wrong",
  "missing",
  "damaged",
  "angry",
];

export const INTENT_KEYWORDS = [
  "buy",
  "order",
  "purchase",
  "price",
  "discount",
  "interested",
  "how much",
  "available",
  "ship",
  "checkout",
];

export function containsKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export interface ProductMentionCandidate {
  externalId: string;
  title: string;
}

export function detectProductMentions(content: string, products: ProductMentionCandidate[]): ProductMentionCandidate[] {
  const lowerContent = content.toLowerCase();
  return products.filter((p) => lowerContent.includes(p.title.toLowerCase()));
}
