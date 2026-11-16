# API operations

[Scope](README.md) · [Domain](DOMAIN.md) · [Decisions](DECISIONS.md)

**Discussion checkpoint: 2026-11-15.** This records the interview-sized contract
so far. Controller routes exist as **501 exercise placeholders**; this is not
implemented booking behaviour or a finished OpenAPI specification.
Precise serialization and unfinished policies remain open.

## Shared conventions

| Area | Current position |
| --- | --- |
| Applicant identity | Comes from trusted backend context; callers do not supply applicantId to create a booking |
| Booking representation | ID, slot, applicant, status and version |
| Slot representation | Available-slot responses retain ID, start time and end time; the stored booked flag need not be exposed |
| Collection responses | Plain JSON arrays; no pagination for this bounded exercise |
| Application 5xx errors | Object containing timestamp, status, error and path |
| DTO starter shape | SlotResponse has numeric ID and Instant times; BookingResponse has a slot DTO, applicant ID, status and version. Request-version and idempotency metadata remain TODOs |

## GET /slots — available slots

| Item | Contract |
| --- | --- |
| Purpose | List slots where `booked = false` and start time is in the future |
| Success | **200**, array of slots |
| Each element | ID, start time, end time |
| Server failure | **5xx**, shared error object |

No filters or pagination have been specified. The backend reads stored slot
availability; it need not derive occupancy from bookings for this operation.
The list does not hold a slot: creation must claim it atomically, not rely on
an earlier availability check.

## GET /bookings — current applicant's bookings

| Item | Contract |
| --- | --- |
| Purpose | List the current applicant's active and cancelled bookings |
| Success | **200**, array of bookings |
| Each element | ID, slot, applicant, status and version |
| Server failure | **5xx**, shared error object |

## POST /bookings — create a booking

| Item | Contract |
| --- | --- |
| Business input | Slot ID |
| Retry metadata | Idempotency key; header versus body not yet chosen |
| Applicant | Derived from trusted context |
| New creation succeeds | **201**, created booking |
| Invalid / missing input | **400** |
| Booking-rule conflict | **409**, such as an occupied slot or an existing active booking for the applicant |
| Server failure | **5xx**, shared error object |

Rebooking after cancellation uses this operation to create a **new** booking.
It does not replace or reactivate the cancelled booking.

**Draft persistence flow:** atomically change the target slot's `booked` flag from
`false` to `true`, conditional on it still being unbooked and in the future.
An affected-row count of 1 means this transaction claimed it; 0 means it did not
claim it, so it must not create the booking. An occupied-slot conflict returns
**409**; exact missing/past-slot errors remain open below.

Save the new active booking and successful idempotency result in the **same
transaction** as the slot claim. Roll back all of them if creation fails.
The one-active-booking-per-applicant rule needs its own atomic enforcement;
claiming a slot does not enforce it.

Completed idempotent retries are a separate case from new booking-rule conflicts;
their response/status policy is not finalized below.

## PATCH /bookings/{id} — cancel or reschedule

| Item | Contract |
| --- | --- |
| Target | Booking ID in the path; do not repeat it in the body |
| Cancel input | New status |
| Reschedule input | New slot ID |
| Concurrency input | Client's expected booking version; proposed as body metadata, exact field name not finalized |
| Success | **200**, updated booking with its current version |
| Invalid / missing mutation field | **400** |
| Booking not found | **404** |
| Forbidden transition / unavailable target / version mismatch | **409** |
| Server failure | **5xx**, shared error object |

**Exactly one mutation action per request:**

| Mutation fields | Behaviour |
| --- | --- |
| Status only | Attempt status change/cancellation |
| Slot ID only | Attempt rescheduling |
| Both | Reject with **400** |
| Neither | Reject with **400** |

Version metadata is separate from these mutation fields.

**Lifecycle rules**

- `ACTIVE` → `CANCELLED` is allowed; reopening is not.
- A reschedule preserves booking ID and applicant, changing the slot.
- The booking must belong to the current applicant and be active to reschedule.
- Target selection must satisfy the future/available-slot rules.
- Cancellation updates the booking and clears its slot's `booked` flag in one transaction.
- Rescheduling conditionally claims the target slot, changes the booking with its
  expected-version check, and clears the original slot's flag in one transaction.
- Failed rescheduling or a version conflict rolls back every flag/booking change;
  the original booking and reservation are preserved.
- A same-status no-op must not release a slot again or change any flags.
- Setting an already-current status is a **200 no-op**, returning current details.
  How that interacts with a stale expected version still needs a policy decision.

## Optimistic concurrency — agreed direction

| Step | Behaviour |
| --- | --- |
| Read | Return the booking version |
| Update request | Include the version the client read |
| Compare | Require an exact version match; reject any mismatch |
| Successful change | Increment the version and return the updated booking |
| Concurrent writers | Compare and update atomically with a conditional database write |
| Mismatch | **409** for the proposed body-based version contract |

A separate read-then-unconditional-write check is insufficient: two requests can
both read the same version before either writes. Gabriel identified the
conditional update as the solution. The skeleton uses Spring Data JPA/H2 and
`@Version` on Booking; expected-version request validation, mutation transactions
and conflict-to-409 mapping remain unimplemented.

## Creation idempotency — chosen direction and open policies

**Chosen:** store original request values and a booking reference, rather than
store the entire original HTTP response. See the [proposed record](DOMAIN.md#proposed-supporting-record-idempotency).

| Case | Discussion outcome |
| --- | --- |
| Same key, different request values | Gabriel proposes conflict; **409** is the proposed response |
| Same request, complete | Gabriel proposes returning the referenced booking; exact HTTP status/replay representation remains open |
| Same request while original transaction runs | No public `IN_PROGRESS` state; the competing key insert waits for commit/rollback. Wait-timeout response remains open |
| Original transaction rolls back | No completed key result remains; a later attempt may claim the key. Retained-failure replay policy remains open |
| Two first requests with the same key | Draft mechanism: a unique key constraint plus atomic insert-if-absent; only the acquiring request performs creation |

**Decided:** key acquisition, slot claim, booking creation and the completed
idempotency result share **one short database transaction**. No separately
committed `IN_PROGRESS` record or processing-status endpoint is supported. If the
original commits, a duplicate proceeds to completed-result handling; if it rolls
back, a competing insert can acquire the key. Waiting must still have a bounded
timeout; its exact error/retry contract remains open.

**Additional suggestions, not final decisions**

- Scope keys to applicant and operation.
- Compare original request values before branching on processing status.

## Remaining decisions

| Topic | Still open |
| --- | --- |
| Version validation | Exact metadata field; missing/malformed version; ordering versus same-status no-op |
| Idempotency contract | Key transport/requirements, uniqueness scope, failure handling, replay status, retention and recovery |
| Booking validation | Exact error for an unknown target slot, unavailable versus past slot, or a same-slot reschedule |
| Ownership failures | Behaviour when a supplied booking ID belongs to another applicant |
| Slot/applicant integrity | Conditional slot-flag claim is the draft approach; exact SQL, defensive constraints and separate applicant-limit enforcement remain to choose |

No GET /bookings/{id}, applicant-management or interviewer-side operations have
been specified. These notes capture the current scope; they do not add those
operations implicitly.
