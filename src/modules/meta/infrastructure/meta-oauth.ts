import { env } from "@/shared/config";
import { logger } from "@/shared/observability";
import { z } from "zod";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const REQUEST_TIMEOUT_MS = 15000;

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

const pageAccountSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  access_token: z.string().optional(),
  instagram_business_account: z
    .object({ id: z.string() })
    .optional(),
});

const accountsResponseSchema = z.object({
  data: z.array(pageAccountSchema),
});

export interface MetaOAuthAccount {
  accountId: string;
  pageAccessToken: string;
  pageId: string;
  pageName?: string;
}

/**
 * Builds the Facebook Login OAuth URL for a project. The project id is carried
 * in `state` and must be verified in the callback handler.
 */
export function getMetaOAuthUrl(projectId: string): string {
  const clientId = env.META_APP_ID;
  if (!clientId) {
    throw new Error("META_APP_ID is not configured.");
  }
  const redirectUri = encodeURIComponent(env.META_REDIRECT_URI);
  const scope = encodeURIComponent(
    [
      "instagram_basic",
      "instagram_content_publish",
      "pages_read_engagement",
      "pages_manage_metadata",
      "whatsapp_business_management",
      "whatsapp_business_messaging",
    ].join(","),
  );
  const state = encodeURIComponent(projectId);
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;
}

async function fetchGraph<T>(
  url: string,
  init?: RequestInit,
  schema?: z.ZodType<T>,
): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    const text = await res.text();
    logger.warn("meta.oauth.graphError", { status: res.status, url, body: text });
    throw new Error(`Meta OAuth graph error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (schema) return schema.parse(json);
  return json as T;
}

/**
 * Exchanges a short-lived code for a long-lived user access token, then resolves
 * the first connected Facebook Page that has an Instagram Business account.
 * Falls back to the first Page when no Instagram account is linked.
 */
export async function exchangeMetaOAuthCode(
  code: string,
): Promise<{ accessToken: string; expiresAt?: Date }> {
  const clientId = env.META_APP_ID;
  const clientSecret = env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required for Meta OAuth.");
  }

  const redirectUri = encodeURIComponent(env.META_REDIRECT_URI);
  const tokenUrl =
    `${GRAPH_API_BASE}/oauth/access_token?` +
    `client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${encodeURIComponent(code)}`;

  const shortLived = await fetchGraph(tokenUrl, { method: "GET" }, tokenResponseSchema);

  const longLivedUrl =
    `${GRAPH_API_BASE}/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${encodeURIComponent(shortLived.access_token)}`;

  const longLived = await fetchGraph(longLivedUrl, { method: "GET" }, tokenResponseSchema);

  return { accessToken: longLived.access_token };
}

/**
 * Given a user access token, list Pages and return the first Page that has an
 * Instagram Business account, along with its page access token.
 */
export async function fetchInstagramAccount(
  userAccessToken: string,
): Promise<MetaOAuthAccount | null> {
  const url =
    `${GRAPH_API_BASE}/me/accounts?` +
    `fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userAccessToken)}`;

  const pages = await fetchGraph(url, { method: "GET" }, accountsResponseSchema);
  if (pages.data.length === 0) return null;

  const withInstagram = pages.data.find((p) => p.instagram_business_account?.id && p.access_token);
  if (withInstagram) {
    return {
      pageId: withInstagram.id,
      pageName: withInstagram.name,
      pageAccessToken: withInstagram.access_token!,
      accountId: withInstagram.instagram_business_account!.id,
    };
  }

  const first = pages.data.find((p) => p.access_token);
  if (!first) return null;

  return {
    pageId: first.id,
    pageName: first.name,
    pageAccessToken: first.access_token!,
    accountId: first.id,
  };
}
