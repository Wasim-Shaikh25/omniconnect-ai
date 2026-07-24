import { DomainEvent } from "./domain-event";
import { UniqueId } from "./identifier";

/** Base class for domain entities, identified by a UniqueId. */
export abstract class Entity<TProps> {
  protected readonly _id: UniqueId;
  protected props: TProps;

  constructor(props: TProps, id?: UniqueId) {
    this._id = id ?? new UniqueId();
    this.props = props;
  }

  get id(): UniqueId {
    return this._id;
  }

  equals(other?: Entity<TProps>): boolean {
    return !!other && this._id.equals(other._id);
  }
}

/**
 * Aggregate roots are the only entities that record domain events.
 * Infrastructure pulls events after persistence and publishes them on the event bus.
 */
export abstract class AggregateRoot<TProps> extends Entity<TProps> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }
}
