import { createHmac, randomBytes } from "crypto";
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

export interface MetaOAuthState {
  projectId: string;
  nonce: string;
}

function signingKey(): string {
  return env.NEXTAUTH_SECRET ?? env.ENCRYPTION_KEY ?? "";
}

function getMetaRedirectUri(): string {
  if (env.META_REDIRECT_URI) return env.META_REDIRECT_URI;
  if (!env.APP_URL) throw new Error("APP_URL is required to derive the Meta OAuth redirect URI.");
  const base = env.APP_URL.replace(/\/$/, "");
  return `${base}/api/meta/callback`;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function generateMetaOAuthNonce(): string {
  return randomBytes(16).toString("hex");
}

export function createMetaOAuthState(projectId: string, nonce: string): string {
  const key = signingKey();
  if (!key) throw new Error("NEXTAUTH_SECRET or ENCRYPTION_KEY is required to sign the OAuth state.");
  const payload = `${projectId}|${nonce}`;
  const signature = createHmac("sha256", key).update(payload).digest("base64url");
  const state = {
    p: base64UrlEncode(projectId),
    n: base64UrlEncode(nonce),
    s: signature,
  };
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

export function verifyMetaOAuthState(state: string, nonce: string): string | null {
  const key = signingKey();
  if (!key) return null;
  try {
    const raw = base64UrlDecode(state);
    const parsed = JSON.parse(raw) as { p: string; n: string; s: string };
    if (base64UrlDecode(parsed.n) !== nonce) return null;
    const projectId = base64UrlDecode(parsed.p);
    const expected = createHmac("sha256", key).update(`${projectId}|${nonce}`).digest("base64url");
    if (!timingSafeEqual(parsed.s, expected)) return null;
    return projectId;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  let mismatch = 0;
  for (let i = 0; i < ab.length; i++) {
    mismatch |= ab[i]! ^ bb[i]!;
  }
  return mismatch === 0;
}

/**
 * Builds the Facebook Login OAuth URL for a project. The `state` parameter must
 * be a value created with `createMetaOAuthState` and bound to the user's session
 * (e.g. via a cookie) so the callback can verify it.
 */
export function getMetaOAuthUrl(projectId: string, state: string): string {
  const clientId = env.META_APP_ID;
  if (!clientId) {
    throw new Error("META_APP_ID is not configured.");
  }
  const redirectUri = encodeURIComponent(getMetaRedirectUri());
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
  const encodedState = encodeURIComponent(state);
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${encodedState}&scope=${scope}&response_type=code`;
}

async function fetchGraph<T>(
  url: string,
  init?: RequestInit,
  schema?: z.ZodType<T>,
): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) {
    const text = await res.text();
    let parsed: { error?: { message?: string; code?: number }; error_description?: string } | undefined;
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      // leave as undefined
    }
    logger.warn("meta.oauth.graphError", {
      status: res.status,
      code: parsed?.error?.code,
      message: parsed?.error?.message,
    });
    throw new Error(`Meta OAuth graph error ${res.status}`);
  }
  const json = await res.json();
  if (schema) return schema.parse(json);
  return json as T;
}

/**
 * Exchanges a short-lived code for a long-lived user access token, then resolves
 * the first connected Facebook Page that has an Instagram Business account.
 * Returns `null` when the user has Pages but none of them are linked to an
 * Instagram Business account.
 */
export async function exchangeMetaOAuthCode(
  code: string,
): Promise<{ accessToken: string; expiresAt?: Date }> {
  const clientId = env.META_APP_ID;
  const clientSecret = env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required for Meta OAuth.");
  }

  const redirectUri = getMetaRedirectUri();

  const tokenParams = new URLSearchParams();
  tokenParams.set("client_id", clientId);
  tokenParams.set("redirect_uri", redirectUri);
  tokenParams.set("client_secret", clientSecret);
  tokenParams.set("code", code);

  const shortLived = await fetchGraph(
    `${GRAPH_API_BASE}/oauth/access_token`,
    { method: "POST", body: tokenParams },
    tokenResponseSchema,
  );

  const longLivedParams = new URLSearchParams();
  longLivedParams.set("grant_type", "fb_exchange_token");
  longLivedParams.set("client_id", clientId);
  longLivedParams.set("client_secret", clientSecret);
  longLivedParams.set("fb_exchange_token", shortLived.access_token);

  const longLived = await fetchGraph(
    `${GRAPH_API_BASE}/oauth/access_token`,
    { method: "POST", body: longLivedParams },
    tokenResponseSchema,
  );

  return { accessToken: longLived.access_token };
}

/**
 * Given a user access token, list Pages and return the first Page that has an
 * Instagram Business account, along with its page access token.
 */
export async function fetchInstagramAccount(
  userAccessToken: string,
): Promise<MetaOAuthAccount | null> {
  const url = new URL(`${GRAPH_API_BASE}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,instagram_business_account");

  const pages = await fetchGraph(
    url.toString(),
    { method: "GET", headers: { authorization: `Bearer ${userAccessToken}` } },
    accountsResponseSchema,
  );

  const withInstagram = pages.data.find(
    (p) => p.instagram_business_account?.id && p.access_token,
  );
  if (withInstagram) {
    return {
      pageId: withInstagram.id,
      pageName: withInstagram.name,
      pageAccessToken: withInstagram.access_token!,
      accountId: withInstagram.instagram_business_account!.id,
    };
  }

  return null;
}
