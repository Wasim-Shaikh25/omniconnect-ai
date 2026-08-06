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

export function makePublishMedia(deps: {
  publishMedia: MetaService["publishMedia"];
}) {
  return async function publishMedia(
    raw: PublishMediaInput,
  ): Promise<Result<PublishMediaResult, Error>> {
    const input = publishMediaSchema.parse(raw);

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
