export const INVITE_STATUSES = ["PENDING", "ACCEPTED", "EXPIRED"] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];
