/** Typed errors for the ecommerce module. Never leak provider secrets in messages. */

export class EcommerceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProviderNotSupportedError extends EcommerceError {
  constructor(provider: string) {
    super(`eCommerce provider not supported: ${provider}`);
  }
}

export class StoreNotFoundError extends EcommerceError {
  constructor(projectId: string) {
    super(`Store not found: ${projectId}`);
  }
}

export class StoreNotConnectedError extends EcommerceError {
  constructor(projectId: string) {
    super(`Store has no active eCommerce connection: ${projectId}`);
  }
}

export class ConnectorError extends EcommerceError {
  constructor(provider: string, operation: string) {
    super(`Connector operation failed (${provider}.${operation}).`);
  }
}
