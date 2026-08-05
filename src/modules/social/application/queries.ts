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
    async listComments(projectId: string, limit = 50) {
      return deps.comments.listByStore(projectId, limit);
    },
    async listMentions(projectId: string, limit = 50) {
      return deps.mentions.listByStore(projectId, limit);
    },
  };
}
