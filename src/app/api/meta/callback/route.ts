import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { checkStoreAccess } from "@/modules/workspaces";
import {
  connectMeta,
  exchangeMetaOAuthCode,
  fetchInstagramAccount,
  verifyMetaOAuthState,
} from "@/modules/meta/server";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "meta_oauth_state";
const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

function parseCookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function trustedOrigin(): string {
  const origin = env.APP_URL ?? "http://localhost:3000";
  return origin.replace(/\/$/, "");
}

function redirectWithError(projectId: string | null, code: string): Response {
  const base = projectId ? `/stores/${projectId}/settings` : "/settings";
  const url = new URL(base, trustedOrigin());
  url.searchParams.set("meta_error", code);
  const response = NextResponse.redirect(url.toString());
  response.cookies.set(OAUTH_STATE_COOKIE, "", OAUTH_COOKIE_OPTIONS);
  return response;
}

function redirectSuccess(projectId: string): Response {
  const response = NextResponse.redirect(
    new URL(`/stores/${projectId}/settings?meta=connected`, trustedOrigin()).toString(),
  );
  response.cookies.set(OAUTH_STATE_COOKIE, "", OAUTH_COOKIE_OPTIONS);
  return response;
}

/**
 * Meta OAuth callback. Verifies the CSRF state, exchanges the code for a
 * long-lived token, resolves the first connected Page that has an Instagram
 * Business account, and persists the token on the Project row.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", trustedOrigin()));
  }

  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  const cookieHeader = request.headers.get("cookie");
  const nonce = parseCookieValue(cookieHeader, OAUTH_STATE_COOKIE);

  if (error || !state || !nonce) {
    const code = errorReason ?? error ?? "denied";
    logger.warn("meta.oauth.denied", { error: code });
    return redirectWithError(null, code);
  }

  const projectId = verifyMetaOAuthState(state, nonce);
  if (!projectId) {
    logger.warn("meta.oauth.invalidState", { stateLength: state.length });
    return redirectWithError(null, "invalid_state");
  }

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    return redirectWithError(projectId, "forbidden");
  }

  if (!code) {
    return redirectWithError(projectId, "missing_code");
  }

  try {
    const { accessToken } = await exchangeMetaOAuthCode(code);
    const account = await fetchInstagramAccount(accessToken);

    if (!account) {
      return redirectWithError(projectId, "no_instagram_account");
    }

    await connectMeta({
      projectId,
      channel: "INSTAGRAM",
      accountId: account.accountId,
      pixelId: null,
      accessToken: account.pageAccessToken,
    });

    logger.info("meta.oauth.connected", {
      projectId,
      accountId: account.accountId,
      pageId: account.pageId,
    });

    return redirectSuccess(projectId);
  } catch (error) {
    const code = error instanceof Error ? "oauth_failed" : "unknown";
    logger.error("meta.oauth.callbackFailed", { projectId, error: code });
    return redirectWithError(projectId, code);
  }
}
