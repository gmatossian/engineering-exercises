# Domain

[Scope](README.md) · [API operations](API.md) · [Decisions](DECISIONS.md)

**Discussion checkpoint: 2026-11-15.** Core objects now have JPA entity skeletons.
The model below describes intended behaviour; booking rules are unimplemented.
Open choices are labelled separately.

## Core objects

| Object | Information identified | Responsibility |
| --- | --- | --- |
| **Slot** | ID, start time, end time, booked flag | A predefined interview time; `booked` records whether it is occupied |
| **Booking** | ID, slot, applicant, status, version | An applicant's reservation, retaining its identity through rescheduling |
| **Applicant** | ID, associated bookings | Owner of the bookings; identity is already known to the backend |

**Booking status:** `ACTIVE` or `CANCELLED`.

- Slot has a boolean `booked` flag, initially `false` for unoccupied seeded slots.
- Slot has no `bookedBy` field; the booking identifies the applicant.
- Applicant-to-bookings is a relationship, not a decision to persist a duplicate list.
- Skeleton mappings: generated `Long` IDs, `Instant` slot times, enum booking status,
  boolean slot occupancy, and a JPA-managed `Long` booking version.
- Slot/applicant references are lazy JPA many-to-one relationships. Applicant
  bookings are queried through the repository rather than a bidirectional collection.

## Relationships and invariants

| Relationship / rule | Constraint |
| --- | --- |
| Booking → slot | One slot per booking |
| Booking → applicant | One owner per booking |
| Applicant → bookings | May have historical bookings; at most **one active** booking in this calendar |
| Slot → bookings | May be reused after cancellation/rescheduling; at most **one active** booking at a time |
| Slot times | Seeded, equal duration and non-overlapping |
| Selecting a slot | Only an available future slot may be booked or selected for rescheduling |
| Ownership | Changes apply only to the current applicant's booking |

> **Availability is not a promise:** a slot shown as available can be claimed by
> someone else before submission. The server makes the final decision.

## Stored availability

**Decided:** store occupancy explicitly as `Slot.booked`, rather than derive it
for each availability read from active bookings.

| State / rule | Meaning |
| --- | --- |
| `booked = false` | Slot is unoccupied; it is bookable only if it also starts in the future |
| `booked = true` | Slot is occupied by one active booking |
| Consistency invariant | A committed slot is booked exactly when an active booking references it |
| Booking ownership and history | Stay on Booking; the flag does not identify the applicant or replace booking records |

**Draft write approach:** claim an unbooked future slot with an atomic conditional
database update, not a separate read followed by an unconditional flag change.
Persist the flag and corresponding booking changes in the **same transaction**.
The flag alone does not enforce the separate one-active-booking-per-applicant rule.

## Lifecycle

| Action | Booking identity / state | Availability effect |
| --- | --- | --- |
| Create | New booking, `ACTIVE` | Atomically claim selected slot: `booked = false` → `true` |
| Reschedule | Same booking ID and applicant; change its slot | Claim target (`true`), move booking, release original (`false`) in one transaction |
| Cancel | Retain the booking as `CANCELLED` | Set its slot to `booked = false` in the same transaction |
| Rebook after cancellation | Create a new booking | Claim the newly selected slot: `false` → `true` |
| Reopen / reschedule a cancelled booking | Not allowed | No change |
| Failed reschedule | Original booking remains unchanged | Roll back all flag changes; original slot stays booked |

Cancelled bookings remain viewable; cancellation changes their status rather
than deleting them.

## Concurrency responsibilities

| Concern | What it protects |
| --- | --- |
| **Booking version** | Reject an update based on an older booking representation |
| **Slot capacity** | Atomic `booked = false` → `true` claim; commit it together with the booking |
| **Applicant limit** | Prevent multiple active bookings for one applicant |
| **Idempotency** | Prevent retries of one creation request from creating another booking |
| **Atomic rescheduling** | Preserve the original reservation if the replacement cannot be secured |

These are separate guarantees. A booking-version check or an idempotency key
alone does not enforce slot capacity.

## Proposed supporting record: idempotency

**Chosen direction:** retain a booking reference rather than a complete original
response. Record shape and failure policies are still being refined.

| Information | Purpose / current position |
| --- | --- |
| Idempotency key | Recognize retries of one operation |
| Original request values | Detect key reuse with different values, such as a different slot |
| Completion | Only a successful result is committed in the current design; no separately committed `IN_PROGRESS` record |
| Booking reference | On completion, locate the booking created by the original request |
| Applicant / operation scope | Suggested by the agent; exact uniqueness scope not finalized |

**Decided:** use one short transaction for key acquisition, slot claim, booking
creation and the completed key/result. Concurrent same-key inserts wait for that
transaction to finish; only a completed result is visible after commit. Rollback
removes the attempted key record along with the slot/booking changes. There is no
public `IN_PROGRESS` state. Wait-timeout and retained-failure policies remain open.

Returning a booking by reference can return its **current** state after later
rescheduling/cancellation; it does not preserve the original response snapshot.
The implication was discussed; exact replay behaviour remains to finalize.

## Open domain / storage choices

| Choice | Status |
| --- | --- |
| Fixed slot duration and any cancellation cutoff | Product rule open; seed fixtures use 30 minutes only for demonstration |
| Database and persistence | H2 in memory; JPA/Hibernate generates the skeleton schema. Booking integrity queries/constraints remain to implement |
| Idempotency record uniqueness, retention and recovery | Open |

For the operation shapes and version/idempotency policies, see [API.md](API.md).
