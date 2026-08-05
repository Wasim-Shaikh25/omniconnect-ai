import { BaseDomainEvent } from "@/shared/kernel";

export interface CommentRepliedPayload {
  storeId: string;
  commentId: string;
  replyText: string;
}

export class CommentReplied extends BaseDomainEvent<CommentRepliedPayload> {
  readonly name = "CommentReplied";
}

export interface CommentHiddenPayload {
  storeId: string;
  commentId: string;
}

export class CommentHidden extends BaseDomainEvent<CommentHiddenPayload> {
  readonly name = "CommentHidden";
}
