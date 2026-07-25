import type {
  SocialCommentRepository,
  SocialMentionRepository,
  SocialQueries,
} from "./ports";

export function makeSocialQueries(deps: {
  comments: SocialCommentRepository;
  mentions: SocialMentionRepository;
}): SocialQueries {
  return {
    async listComments(storeId: string, limit = 50) {
      return deps.comments.listByStore(storeId, limit);
    },
    async listMentions(storeId: string, limit = 50) {
      return deps.mentions.listByStore(storeId, limit);
    },
  };
}
