import { z } from "zod";
import { Result, ok, err } from "@/shared/kernel";
import type { MetaService, PublishMediaResult } from "@/modules/meta";

export const publishMediaSchema = z.object({
  projectId: z.string().min(1),
  caption: z.string().max(2200).optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "REEL", "CAROUSEL", "STORY"] as const),
  mediaUrls: z.array(z.string().url()).min(1).max(10),
});

export type PublishMediaInput = z.infer<typeof publishMediaSchema>;

function formatValidationIssues(issues: z.ZodIssue[]): string {
  const first = issues[0];
  if (!first) return "Invalid input.";
  const topLevelPath = first.path[0];
  if (topLevelPath === "mediaUrls") {
    if (first.code === "too_big") return "You can only publish up to 10 media URLs at once.";
    if (first.code === "too_small") return "At least one media URL is required.";
    if (first.code === "invalid_string" && first.validation === "url") {
      return "Every media URL must be a valid, publicly reachable URL.";
    }
  }
  return `${first.path.join(".") || "Input"}: ${first.message}`;
}

export function makePublishMedia(deps: {
  publishMedia: MetaService["publishMedia"];
}) {
  return async function publishMedia(
    raw: PublishMediaInput,
  ): Promise<Result<PublishMediaResult, Error>> {
    const parsed = publishMediaSchema.safeParse(raw);
    if (!parsed.success) {
      return err(new Error(formatValidationIssues(parsed.error.issues)));
    }
    const input = parsed.data;

    const result = await deps.publishMedia(input.projectId, {
      caption: input.caption?.trim() || undefined,
      mediaType: input.mediaType,
      mediaUrls: input.mediaUrls,
    });

    if (!result) {
      return err(
        new Error(
          "Failed to publish to the connected Meta account. Check that the Instagram account is connected and the media URL is publicly accessible.",
        ),
      );
    }

    return ok(result);
  };
}

export type PublishMedia = ReturnType<typeof makePublishMedia>;
