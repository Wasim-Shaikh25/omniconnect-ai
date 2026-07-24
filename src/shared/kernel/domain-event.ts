/**
 * Domain events are how modules communicate without coupling.
 * They are immutable, named in the past tense, and carry a minimal payload.
 */
export interface DomainEvent<TPayload = unknown> {
  readonly name: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: TPayload;
}

export abstract class BaseDomainEvent<TPayload> implements DomainEvent<TPayload> {
  abstract readonly name: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly payload: TPayload;

  constructor(aggregateId: string, payload: TPayload) {
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.occurredAt = new Date();
  }
}
