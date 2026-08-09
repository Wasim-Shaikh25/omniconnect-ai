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

export class SeatLimitError extends OrganizationError {
  constructor(limit: number) {
    super(`Team seat limit reached (${limit}). Upgrade your plan to add more members.`);
    this.name = "SeatLimitError";
  }
}

export class StoreNameExistsError extends OrganizationError {
  constructor(name: string) {
    super(`A store named "${name}" already exists.`);
    this.name = "StoreNameExistsError";
  }
}
