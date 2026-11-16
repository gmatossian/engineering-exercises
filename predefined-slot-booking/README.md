# Predefined-slot booking

**Stage:** runnable Java 21 / Spring Boot / Spring Data JPA skeleton; endpoint exercise logic is unimplemented.

An interviewee books one of an interviewer's predefined slots. This exercise
focuses on API design, idempotency, optimistic concurrency and booking integrity.

## Design notes

| Document | Contents |
| --- | --- |
| [DOMAIN.md](DOMAIN.md) | Objects, relationships, lifecycle, invariants and proposed idempotency record |
| [API.md](API.md) | Operation shapes, success/errors, version checks and open idempotency policies |
| [DECISIONS.md](DECISIONS.md) | Choices, reasons, alternatives and unresolved concurrency/retry questions |

These documents preserve the current discussion, separating agreed directions
from suggestions and unresolved details.

[Editable request-flow draft in Excalidraw](https://app.excalidraw.com/s/4SnA1ftmMip/5eb7HdtS1sC).

## Scope

| Area | Agreed rule |
| --- | --- |
| User-facing side | Interviewee only |
| Calendar | One interviewer; seeded slots, no availability editor |
| Slots | Fixed start/end times, equal duration, non-overlapping; stored `booked` flag |
| Selection | One slot, not multiple preferences |
| Interviewee limit | At most one active booking in this calendar |
| Slot capacity | At most one active booking per slot |
| Actions | Browse available slots; book; view; reschedule; cancel |
| Identity | Backend already knows the interviewee; login is outside scope |

## Booking lifecycle

| Action | Required behaviour |
| --- | --- |
| Book | Select an available future slot |
| View | Show the interviewee's booking, including cancelled bookings |
| Reschedule | Move the existing booking to another available future slot |
| Failed reschedule | Preserve the original booking |
| Cancel | Cancel the booking and release its slot |
| Rebook after cancellation | Create a new booking; do not reactivate the cancelled one |
| Reschedule a cancelled booking | Not allowed |

**Time:** only future slots can be booked or selected for rescheduling. Display
the timezone explicitly. The exact duration and cancellation cutoff, if any,
have not been chosen.

**Availability:** the list is informative, not a reservation. A slot can become
unavailable after it is displayed; the server makes the final booking decision.

## Guarantees to design

| Concern | Scenario | Required outcome |
| --- | --- | --- |
| Idempotency | Creation succeeds, response is lost, client retries the same request | No duplicate booking |
| Availability integrity | Different interviewees compete for one slot | At most one active booking for that slot |
| Optimistic concurrency | An old browser tab submits a change after the booking changed | Reject the stale change rather than overwrite newer state |
| Atomic rescheduling | Replacement slot cannot be secured | Original booking remains intact |

These are separate guarantees. An idempotency key alone does not prevent two
different interviewees from booking the same slot.

## Deliberately outside scope

- Interviewer-facing availability creation/editing.
- Multiple interviewers, recurring availability or arbitrary time entry.
- Invitations, email notifications and external calendar synchronization.
- Payments, temporary holds and waitlists.
- Login/account-management UI.

## Design decisions still open

The current domain/storage questions are listed in [DOMAIN.md](DOMAIN.md#open-domain--storage-choices).
Request metadata, idempotency/replay and remaining operation behaviour are listed
in [API.md](API.md#remaining-decisions). The skeleton uses Spring Data JPA and H2;
booking behaviour and concurrency mechanisms are still exercises.

## Project layout

```text
predefined-slot-booking/
  README.md
  DOMAIN.md
  API.md
  DECISIONS.md
  backend/
    pom.xml
    mvnw
    src/
  frontend/
    .gitkeep
```

See [backend setup and exercise entry points](backend/README.md) for versions,
run commands, fixtures and placeholders. `frontend/` remains empty. The scaffold
is agent-created; implementing and reviewing the behaviour is the learning work.
This is a practice scenario, not a confirmed interview assignment.

Tags: `java`, `spring-boot`, `spring-data-jpa`, `hibernate`, `h2`, `api-design`, `booking`, `idempotency`, `optimistic-concurrency`, `transactions`.
