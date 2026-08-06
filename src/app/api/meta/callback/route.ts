import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { checkStoreAccess } from "@/modules/workspaces";
import {
  connectMeta,
  exchangeMetaOAuthCode,
  fetchInstagramAccount,
} from "@/modules/meta/server";
import { logger } from "@/shared/observability";

export const runtime = "nodejs";

/**
 * Meta OAuth callback. Exchanges the code for a long-lived token, resolves the
 * first connected Page + Instagram Business account, and persists the token on
 * the Project row.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("state");
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  if (error || !projectId) {
    const message = errorReason ?? error ?? "unknown";
    logger.warn("meta.oauth.denied", { projectId, error: message });
    return NextResponse.redirect(
      new URL(`/stores/${projectId ?? ""}/settings?meta_error=${encodeURIComponent(message)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/stores/${projectId}/settings?meta_error=missing_code`, request.url),
    );
  }

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    return NextResponse.redirect(
      new URL(`/stores/${projectId}/settings?meta_error=forbidden`, request.url),
    );
  }

  try {
    const { accessToken } = await exchangeMetaOAuthCode(code);
    const account = await fetchInstagramAccount(accessToken);

    if (!account) {
      return NextResponse.redirect(
        new URL(`/stores/${projectId}/settings?meta_error=no_page`, request.url),
      );
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

    return NextResponse.redirect(
      new URL(`/stores/${projectId}/settings?meta=connected`, request.url),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    logger.error("meta.oauth.callbackFailed", { projectId, error: message });
    return NextResponse.redirect(
      new URL(`/stores/${projectId}/settings?meta_error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
