import { BaseDomainEvent } from "@/shared/kernel";
import { Role } from "./role";

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  role: Role;
  /** When true, the organizations module should auto-provision a workspace.
   *  Credentials registrations should set this to false so the user lands on
   *  `/onboarding` and creates the workspace explicitly. */
  autoProvisionOrganization?: boolean;
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
