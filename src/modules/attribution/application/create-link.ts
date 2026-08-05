import type {
  AttributionLink,
  AttributionLinkRepository,
  CouponLookup,
  ProjectConfig,
} from "./ports";

function generateShortCode(): string {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join("");
}

function buildCheckoutUrl(
  baseUrl: string,
  couponCode: string | null | undefined,
  couponUrlPattern: string | null | undefined,
): string {
  const normalized = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const url = new URL(normalized);

  if (couponCode) {
    const pattern = couponUrlPattern?.trim();
    if (pattern && pattern.includes("{{code}}")) {
      const path = pattern.replace("{{code}}", encodeURIComponent(couponCode));
      if (path.startsWith("http")) {
        return path;
      }
      url.pathname = path;
      return url.toString();
    }
    url.searchParams.set("discount", couponCode);
  }

  return url.toString();
}

export interface CreateLinkInput {
  projectId: string;
  couponId?: string | null;
  utmSource: string;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface CreateAttributionLink {
  (input: CreateLinkInput): Promise<AttributionLink>;
}

export function makeCreateAttributionLink(
  links: AttributionLinkRepository,
  coupons: CouponLookup,
  projects: ProjectConfig,
): CreateAttributionLink {
  return async function createAttributionLink(input) {
    const { baseUrl, couponUrlPattern } = await projects.getEcommerceBaseUrl(input.projectId);

    if (!baseUrl) {
      throw new Error("Store does not have a connected e-commerce base URL");
    }

    let couponCode: string | null = null;
    if (input.couponId) {
      const coupon = await coupons.findById(input.projectId, input.couponId);
      if (!coupon) {
        throw new Error("Coupon not found");
      }
      couponCode = coupon.code;
    }

    const checkoutUrl = buildCheckoutUrl(baseUrl, couponCode, couponUrlPattern);
    const url = new URL(checkoutUrl);
    url.searchParams.set("utm_source", input.utmSource);
    if (input.utmMedium) url.searchParams.set("utm_medium", input.utmMedium);
    if (input.utmCampaign) url.searchParams.set("utm_campaign", input.utmCampaign);

    const shortCode = generateShortCode();
    return links.create({
      ...input,
      fullUrl: url.toString(),
      shortCode,
    });
  };
}
