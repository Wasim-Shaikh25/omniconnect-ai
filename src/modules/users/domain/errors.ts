export class UserError extends Error {}

export class UserNotFoundError extends UserError {
  constructor(id: string) {
    super(`User not found: ${id}`);
    this.name = "UserNotFoundError";
  }
}
