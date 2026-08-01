export interface ModerationResult {
  flagged: boolean;
  categories?: string[];
}

export interface ContentModerator {
  moderate(text: string): Promise<ModerationResult>;
}
