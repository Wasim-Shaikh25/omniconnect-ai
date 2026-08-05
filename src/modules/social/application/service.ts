import { logger } from "@/shared/observability";
import { eventBus } from "@/shared/events";
import type {
  SocialAutomationService,
  SocialCommentRepository,
  SocialMentionRepository,
} from "./ports";
import { CommentHidden, CommentReplied } from "../domain/events";

export interface SocialServiceDeps {
  comments: SocialCommentRepository;
  mentions: SocialMentionRepository;
}

function classifyComment(text: string): { intent: string; sentiment: string; autoReply: string | null } {
  const lower = text.toLowerCase();
  const purchaseSignals = ["buy", "order", "price", "cost", "how much", "discount", "coupon", "purchase"];
  const complaintSignals = ["bad", "worst", "terrible", "broken", "refund", "complaint", "angry"];
  const spamSignals = ["follow me", "dm for", "check my page", "free gift"];

  if (spamSignals.some((s) => lower.includes(s))) {
    return { intent: "SPAM", sentiment: "NEGATIVE", autoReply: null };
  }
  if (complaintSignals.some((s) => lower.includes(s))) {
    return { intent: "COMPLAINT", sentiment: "NEGATIVE", autoReply: "We're sorry to hear that. A team member will reach out to make this right." };
  }
  if (purchaseSignals.some((s) => lower.includes(s))) {
    return { intent: "PURCHASE_INTENT", sentiment: "POSITIVE", autoReply: "Thanks for your interest! Check the link in our bio or send us a DM and we'll share the details." };
  }
  if (lower.includes("thank") || lower.includes("love") || lower.includes("great")) {
    return { intent: "COMPLIMENT", sentiment: "POSITIVE", autoReply: "So glad you love it! Thanks for the support." };
  }
  if (lower.includes("?") || lower.includes("how") || lower.includes("what") || lower.includes("when")) {
    return { intent: "QUESTION", sentiment: "NEUTRAL", autoReply: "Great question — we sent you a DM with the answer!" };
  }
  return { intent: "OTHER", sentiment: "NEUTRAL", autoReply: "Thanks for commenting! We'll be in touch soon." };
}

export function makeSocialAutomationService(deps: SocialServiceDeps): SocialAutomationService {
  return {
    async handleComment(input) {
      const { intent, sentiment, autoReply } = classifyComment(input.text);
      const comment = await deps.comments.create({
        projectId: input.projectId,
        externalMediaId: input.externalMediaId,
        externalCommentId: input.externalCommentId,
        externalUserId: input.externalUserId,
        username: input.username,
        text: input.text,
        intent,
        sentiment,
        autoReplyText: autoReply,
      });

      logger.info("social.comment.handled", {
        commentId: comment.id,
        projectId: input.projectId,
        intent,
        sentiment,
      });

      return comment;
    },

    async replyToComment(id, projectId, replyText) {
      const comment = await deps.comments.markReplied(id, replyText);
      await eventBus.publish(
        new CommentReplied(projectId, { projectId, commentId: id, replyText }),
      );
      return comment;
    },

    async toggleHidden(id, projectId, hidden) {
      const comment = await deps.comments.markHidden(id, hidden);
      if (hidden) {
        await eventBus.publish(new CommentHidden(projectId, { projectId, commentId: id }));
      }
      return comment;
    },
  };
}
