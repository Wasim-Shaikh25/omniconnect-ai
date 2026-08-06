/** Typed errors for the meta module. Never leak tokens/secrets in messages. */

export class MetaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidSignatureError extends MetaError {
  constructor() {
    super("Invalid webhook signature.");
  }
}

export class UnknownAccountError extends MetaError {
  constructor(accountId: string) {
    super(`No store is connected to Meta account: ${accountId}`);
  }
}

export class MetaNotConnectedError extends MetaError {
  constructor(projectId: string) {
    super(`Store has no Meta connection: ${projectId}`);
  }
}

export class MetaRateLimitError extends MetaError {
  public readonly resetAt: number;
  constructor(resetAt: number) {
    super(`Instagram Graph API rate limit exceeded. Retry after ${new Date(resetAt).toISOString()}.`);
    this.resetAt = resetAt;
    this.name = new.target.name;
  }
}
