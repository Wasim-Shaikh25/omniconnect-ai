export class OrganizationError extends Error {}

export class OrganizationNotFoundError extends OrganizationError {
  constructor(id: string) {
    super(`Organization not found: ${id}`);
    this.name = "OrganizationNotFoundError";
  }
}

export class StoreLimitError extends OrganizationError {
  constructor(message = "Store limit reached") {
    super(message);
    this.name = "StoreLimitError";
  }
}
