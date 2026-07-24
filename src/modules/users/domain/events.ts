import { BaseDomainEvent } from "@/shared/kernel";

export interface UserProfileUpdatedPayload {
  userId: string;
  name: string | null;
}

export class UserProfileUpdated extends BaseDomainEvent<UserProfileUpdatedPayload> {
  readonly name = "UserProfileUpdated";
}

export interface UserRoleChangedPayload {
  userId: string;
  role: string;
  changedByUserId: string;
}

export class UserRoleChanged extends BaseDomainEvent<UserRoleChangedPayload> {
  readonly name = "UserRoleChanged";
}
