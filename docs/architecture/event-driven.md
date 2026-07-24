# Event-Driven Architecture

Cross-module reactive flows use **domain events** so modules stay decoupled: publishers never
reference subscribers.

## Event bus
- A shared `EventBus` abstraction (`src/shared/events/`) with `publish(event)` and
  `subscribe(type, handler)`.
- In-process dispatch for synchronous-ish reactions; **BullMQ + Redis** for durable/async
  handlers (retries, backoff, dead-letter).
- Events are immutable, named in past tense, and carry a minimal payload (IDs + essential data).

## Core domain events (initial set)
| Event                     | Published by | Typical subscribers                     |
|---------------------------|--------------|-----------------------------------------|
| `UserRegistered`          | auth         | notifications, analytics                |
| `StoreConnected`          | ecommerce    | analytics, notifications                |
| `NewFollow`               | meta         | crm, campaigns                          |
| `NewMessage`              | meta         | conversations, ai, crm                  |
| `Comment` / `Mention`     | meta         | conversations, ai, analytics            |
| `FirstInteractionDetected`| crm          | coupons                                 |
| `CouponGenerated`         | coupons      | ai/meta (send message), notifications   |
| `CouponUsed`              | ecommerce    | crm, analytics, notifications           |
| `ReplyGenerated`          | ai           | meta (send), conversations              |
| `EscalationRequested`     | ai           | notifications, conversations            |
| `ConversationTakenOver`   | conversations| ai (stop replying), notifications       |
| `AIResumed`               | conversations| ai                                      |

## Example flow — First-Time Follower Campaign
```
meta:          NewFollow(igUserId, username, storeId)
  → crm:       is this a first interaction? → FirstInteractionDetected
  → coupons:   generate personalized coupon (via ecommerce connector) → CouponGenerated
  → ai/meta:   compose + send welcome message with the code
  → notifications: CouponSent (in-app + email to store owner)
```
No module in this chain imports another's internals — each only publishes/handles events.

## Guarantees & guidelines
- Handlers are **idempotent** (events may be redelivered).
- Failures are retried with backoff; poison messages go to a dead-letter queue and raise a
  `SystemError` notification.
- Keep payloads small; consumers fetch more via the publisher's read-port if needed.
- Version events additively; never break an existing payload shape.
