import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { checkStoreAccess } from "@/modules/workspaces";
import {
  createMetaOAuthState,
  generateMetaOAuthNonce,
  getMetaOAuthUrl,
} from "@/modules/meta/server";
import { env } from "@/shared/config";
import { logger } from "@/shared/observability";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "meta_oauth_state";
const OAUTH_STATE_MAX_AGE = 10 * 60; // 10 minutes

/** Starts the Meta OAuth flow for a project. The project id is passed in query. */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const access = await checkStoreAccess(projectId);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const nonce = generateMetaOAuthNonce();
    const state = createMetaOAuthState(projectId, nonce);
    const url = getMetaOAuthUrl(projectId, state);
    const response = NextResponse.redirect(url);
    response.cookies.set(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: OAUTH_STATE_MAX_AGE,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta OAuth not configured";
    logger.warn("meta.oauth.startFailed", { projectId, error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
