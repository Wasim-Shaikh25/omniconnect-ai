import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { checkStoreAccess } from "@/modules/workspaces";
import { getMetaOAuthUrl } from "@/modules/meta/server";
import { logger } from "@/shared/observability";

export const runtime = "nodejs";

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
    const url = getMetaOAuthUrl(projectId);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta OAuth not configured";
    logger.warn("meta.oauth.startFailed", { projectId, error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
