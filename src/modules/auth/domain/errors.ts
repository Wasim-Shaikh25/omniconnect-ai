export class AuthError extends Error {}

export class EmailAlreadyInUseError extends AuthError {
  constructor(email: string) {
    super(`Email already in use: ${email}`);
    this.name = "EmailAlreadyInUseError";
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}
