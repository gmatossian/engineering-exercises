# Decisions and discussion notes

[Scope](README.md) · [Domain](DOMAIN.md) · [API operations](API.md)

**Checkpoint: 2026-11-15.** JPA entity/runnable scaffolding exists; the booking
and concurrency mechanisms below are not implemented. **Decided** = accepted direction; **Proposed** = discussed but not
settled; **Open** = still to work through.

[Model](#model-and-scope) · [Updates](#one-patch-operation-two-exclusive-actions) · [Versions](#optimistic-concurrency) · [Retries](#same-status-retries) · [Idempotency](#creation-idempotency) · [Integrity](#separate-concurrency-guarantees)

## Model and scope

| Decision | Reason / consequence |
| --- | --- |
| **Decided:** one interviewee-facing side, seeded slots | Keep the exercise focused on booking behaviour; availability authoring is outside scope |
| **Decided:** separate Slot from Booking | A slot can be available again while an earlier cancelled booking remains viewable |
| **Decided:** retain cancelled bookings | Cancellation changes state rather than erasing the reservation record |
| **Decided:** the Slot entity does not need a bookedBy attribute | The booking already identifies its applicant |
| **Decided:** derive applicant identity from trusted context | POST needs slot ID, not a caller-selected applicant ID |
| **Decided:** no pagination for the current collections | Keep the first contract simple for the bounded exercise dataset |

### Stored slot availability

| Decision | Reason / consequence |
| --- | --- |
| **Decided:** add boolean `Slot.booked` | Read availability directly from slots, alongside the future-start-time condition |
| **Decided:** retain Booking and its status/history | The flag represents current occupancy, not ownership or historical reporting |
| **Required:** update slot flags and booking data in one transaction | Avoid a booked slot without its active booking, or an active booking whose slot appears free |
| **Proposed:** claim with a conditional `false` → `true` database update | Two requests must not both rely on an earlier read of `false` |

| Operation | Flag changes, committed with the booking change |
| --- | --- |
| Create | Claim target slot (`true`); create active booking |
| Cancel | Clear current slot (`false`); mark booking cancelled |
| Reschedule | Claim target (`true`), move booking, clear original (`false`); all succeed or all roll back |
| Same-status no-op | No flag changes |

**Alternative discussed:** derive occupancy from active bookings with appropriate
indexes. It avoids duplicated state but adds relationship work to availability
queries. Gabriel chose an explicit flag; this is a design preference, not a
measured performance finding. Analytics still depend on booking records and any
history retained, rather than the flag alone.

**Open:** exact database/index/constraint design and separate applicant-limit
enforcement. A flag must not be read and then set unconditionally as a claim.

---

## One PATCH operation, two exclusive actions

**Decided:** use `PATCH /bookings/{id}` for either cancellation/status change or
rescheduling. Do not combine those actions in one request.

| Mutation fields | Outcome | Reason |
| --- | --- | --- |
| Status only | Attempt status update | One clear action |
| Slot ID only | Attempt rescheduling | Booking stays; its slot changes |
| Both | **400** | Combination has no defined meaning in this API |
| Neither | **400** | No mutation requested |

Version metadata is additional information, not a second mutation action.

### Rescheduling versus rebooking

| Choice | Reason / consequence |
| --- | --- |
| **Decided:** reschedule by updating the existing booking | Preserve booking ID and applicant; change the slot |
| **Decided:** rebooking after cancellation uses POST | Create a new booking rather than reopen the old one |
| **Decided:** cancelled bookings cannot be reopened or rescheduled | Preserve the agreed lifecycle |
| **Decided:** rescheduling succeeds entirely or leaves the original intact | A failed attempt must not lose the original reservation |

**Alternative discussed:** POST with an optional original-booking ID, cancelling
one booking and creating another. We moved away from that because this exercise
models rescheduling as a change to the same booking, not replacement identity.

---

## Optimistic concurrency

| Decision | Reason / consequence |
| --- | --- |
| **Decided:** persist a booking version and return it in responses | Give the client the version it actually viewed |
| **Decided:** client supplies that version on update | Detect stale changes from another browser tab/request |
| **Decided:** require exact equality | Any mismatch is invalid; checking only “database version is greater” is incomplete |
| **Decided:** increment the version on successful change | A later stale request can no longer match |
| **Decided:** conditional database update | Compare, mutate and increment atomically; a separate read/check followed by an unconditional write is insufficient |
| **Decided:** return **409** for a booking-version conflict | Signal that the requested change conflicts with current state |

**Race discussed:** two requests both read version 7. With an atomic version
condition, the first successful change advances it; the other can no longer
match 7.

> **Boundary:** this protects updates to one booking. It does not by itself
> prevent two different bookings from claiming the same slot.

**Open:** exact request field/name and validation. Version-in-body is the current
working direction; an ETag/If-Match contract was not selected.

---

## Same-status retries

| Decision | Reason / consequence |
| --- | --- |
| **Decided:** requesting the already-current status is a **200 no-op** | A repeat need not fail or create another state change |
| **Decided:** return current booking details | This is not a promise to replay a saved original HTTP response |

**Open:** precedence when the requested status already matches but the supplied
version is stale. The no-op and version policies must be made consistent.

---

## Creation idempotency

**Decided:** store a **booking reference**, rather than the complete original
response, to keep the initial design moving.

| Record information proposed | Purpose |
| --- | --- |
| Idempotency key | Identify retries of one request |
| Original request values | Detect reuse for a different slot/request |
| Completion | Commit a completed result; no separately committed `IN_PROGRESS` state |
| Booking reference on completion | Locate the result without creating another booking |

### Behaviour discussed

| Situation | Position | Consequence / unresolved part |
| --- | --- | --- |
| Same key, different request values | **Proposed:** conflict / 409 | Do not silently treat a different booking request as the original |
| Same request, complete | **Chosen direction:** return the referenced booking | Exact HTTP replay status remains open |
| Same request while original transaction runs | **Decided:** no public `IN_PROGRESS` state | Competing key insert waits for commit/rollback; timeout behaviour remains open |
| Original transaction rolls back | **Single-transaction consequence:** attempted key, slot and booking writes roll back together | No completed result remains; retained-failure replay policy remains open |

> **Reference versus snapshot:** the booking may have been rescheduled or
> cancelled since creation. Loading by reference can return its current state,
> unlike replaying the original response. Final replay semantics remain open.

### One transaction; no exposed in-progress state

| Decision | Reason / consequence |
| --- | --- |
| **Decided:** keep key acquisition, slot claim, booking and completed result in one transaction | Booking work is expected to be short; avoid a separately committed processing record and its recovery lifecycle |
| **Decided:** do not expose `IN_PROGRESS` | A concurrent duplicate waits for the original transaction outcome |
| Original commits | Duplicate finds the completed record and follows the replay path |
| Original rolls back | Key acquisition rolls back too; a competing attempt can acquire it |

Short transactions can still time out under contention. The waiting/error/retry
policy remains open. This supersedes the earlier proposed in-progress 409 branch.

**Additional proposals, not settled decisions**

- Scope a key to the applicant and operation.
- Compare original request values before branching on processing status.

**Still to design**

| Question | Why it matters |
| --- | --- |
| Exact key constraint / insert-if-absent SQL | Draft uses atomic acquisition, not a separate existence check followed by insertion |
| How should a waiting duplicate time out? | A short transaction does not guarantee an immediate result |
| Should failed responses be retained? | Current transaction rollback leaves no completed result; exact failure replay policy remains open |
| Header or body? Required key? Retention period? | Complete the public retry contract |

---

## Separate concurrency guarantees

| Concern | Required protection | Current position |
| --- | --- | --- |
| Stale change to an existing booking | Booking version comparison | Conditional-update direction decided |
| Retry of the same creation request | Idempotency key/result | Record/replay design in progress |
| Different applicants claim one slot | Slot-capacity invariant | Stored flag chosen; atomic conditional claim proposed |
| One applicant creates bookings for different slots concurrently | One-active-booking invariant | Enforcement open |
| Replacement slot cannot be secured | Atomic rescheduling | Required outcome agreed; implementation open |

**Keep these distinct:** choosing optimistic locking or idempotency does not
finish the slot-capacity or applicant-limit design.


## Skeleton stack and boundaries

| Choice | Position / consequence |
| --- | --- |
| Java 21, Spring Boot 4.1.2, Maven wrapper 3.10.0 | Match the incident exercise toolchain |
| Spring Data JPA rather than Spring JDBC | Explicitly selected by Gabriel for this exercise |
| H2 in memory, Hibernate create-drop | Seed/reset on startup; no migrations or production persistence yet |
| JPA entity classes; response DTO records | Keep persistence relationships separate from HTTP representation |
| Booking `@Version` | JPA version mapping exists; client precondition handling and tested optimistic-concurrency behaviour remain exercises |
| No separately committed IN_PROGRESS state | Agreed one-transaction direction; idempotency storage and transport remain unimplemented |
| Idempotency transport | Gabriel explicitly deferred header versus body; controller does not bind a key yet |
| Fixture choices | 30-minute slots relative to startup, simulated applicant 1; these are adjustable demo choices |
| Port 8082 on loopback | Keep the booking app separate from the incident app on 8081 |
| Repository placeholders | JpaRepository supplies standard CRUD; exercise-specific default methods throw until replaced with queries/implementations |

Request-version field/validation, key scope and replay policy, applicant-limit
enforcement and business error handling remain TODOs. No real authentication or
frontend is introduced by the scaffold.
