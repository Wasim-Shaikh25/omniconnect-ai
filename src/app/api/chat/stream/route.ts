import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/shared/observability";
import { getCurrentUser, requireVerifiedEmail } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { aiConfigurationRepository, chatAssistant } from "@/modules/ai/server";
import { aiUsageGuard } from "@/modules/ai";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  projectId: z.string().min(1),
  content: z.string().min(1).max(4000),
});

async function assertStoreInOrg(userId: string, projectId: string): Promise<boolean> {
  const overview = await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.userId;

  try {
    await requireVerifiedEmail(user);
  } catch {
    return NextResponse.json({ error: "Please verify your email" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return NextResponse.json({ error: "Store not found in your organization" }, { status: 404 });
  }

  try {
    await aiUsageGuard.assertAvailable(user.userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI quota exceeded";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  const config = await aiConfigurationRepository.getOrCreateDefault(parsed.data.projectId);

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      let hasError = false;
      try {
        for await (const chunk of chatAssistant.streamMessage({
          sessionId: parsed.data.sessionId,
          projectId: parsed.data.projectId,
          userId,
          content: parsed.data.content,
          config,
          brandName: user.name ?? undefined,
        })) {
          fullText += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk }) }\n\n`));
        }

        if (fullText.trim()) {
          await chatAssistant.saveAssistantMessage(parsed.data.sessionId, fullText);
        }
      } catch (error) {
        hasError = true;
        const message = error instanceof Error ? error.message : "Stream failed";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message }) }\n\n`));
        if (fullText.trim()) {
          try {
            await chatAssistant.saveAssistantMessage(parsed.data.sessionId, fullText);
          } catch (saveError) {
            logger.error("chat.stream.saveFailed", {
              error: saveError instanceof Error ? saveError.message : "unknown",
            });
          }
        }
      } finally {
        if (hasError || !fullText.trim()) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } else {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
