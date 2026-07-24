/** A stable unique identifier for entities and aggregates. */
export class UniqueId {
  private readonly value: string;

  constructor(value?: string) {
    // Web Crypto is available across Node, edge, and browser runtimes.
    this.value = value ?? globalThis.crypto.randomUUID();
  }

  toString(): string {
    return this.value;
  }

  equals(other?: UniqueId): boolean {
    return !!other && other.value === this.value;
  }
}
