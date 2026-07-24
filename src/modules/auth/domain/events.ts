import { BaseDomainEvent } from "@/shared/kernel";
import { Role } from "./role";

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  role: Role;
}

export class UserRegistered extends BaseDomainEvent<UserRegisteredPayload> {
  readonly name = "UserRegistered";
}

export interface UserLoggedInPayload {
  userId: string;
  email: string;
}

export class UserLoggedIn extends BaseDomainEvent<UserLoggedInPayload> {
  readonly name = "UserLoggedIn";
}
