import type { EventBus } from "@/shared/events";
import { MetaCommentReceived } from "@/modules/meta";
import { growthService } from "./infrastructure/container";

export function registerGrowthSubscribers(bus: EventBus): void {
  bus.subscribe(MetaCommentReceived.name, async (event) => {
    if (!(event instanceof MetaCommentReceived)) return;
    const p = event.payload;
    await growthService.processCommentUnlock({
      projectId: p.projectId,
      externalUserId: p.externalUserId,
      username: p.username ?? null,
      commentId: p.postId ?? null,
      text: p.text,
      channel: p.channel,
    });
  });
}
