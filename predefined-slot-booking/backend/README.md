# Booking backend skeleton

[Scope](../README.md) · [Domain](../DOMAIN.md) · [API](../API.md) · [Decisions](../DECISIONS.md) · [Issue #12](https://github.com/gmatossian/engineering-exercises/issues/12)

**Runnable scaffold, unfinished booking behaviour.** The four API operations return
`501 Not Implemented`. Service/repository exercise methods also remain placeholders.

## Toolchain

| Item | Choice |
| --- | --- |
| Java | 21 |
| Spring Boot | 4.1.2 |
| Maven | Wrapper, 3.10.0 |
| Persistence | Spring Data JPA, Hibernate; H2 runtime |
| Starters | Web MVC, Data JPA, Validation, Actuator; Test for tests |
| Schema | Hibernate create-drop; resets when the process restarts |
| Address | http://127.0.0.1:8082 |

Hibernate, Spring Data and H2 versions are managed by Spring Boot. No Lombok,
Spring Security, Flyway, Docker, frontend or external database is required.

## Run

From this `backend/` directory with JDK 21 selected:

```sh
./mvnw spring-boot:run
```

Or run `BookingApplication` from IntelliJ after importing `pom.xml`; select
Java 21 for both the project SDK and Maven runner/importer. Stop normally to
discard the in-memory database.

```sh
./mvnw verify
curl http://127.0.0.1:8082/actuator/health
```

Health returns `{"status":"UP"}`. GET `/slots`, GET `/bookings`, POST `/bookings`
and PATCH `/bookings/{id}` are registered but intentionally return **501** for
well-formed requests. Endpoint annotations describe the eventual success shape;
they do not make the exercise implemented. Validation/error contracts remain work.

## Seed data

`config/DemoData` seeds through JpaRepository in one startup transaction:

- Two applicants; `DemoApplicantContext` simulates applicant **1**.
- Twelve future, non-overlapping 30-minute slots starting tomorrow at 09:00 UTC.
- One future slot booked by the other applicant; eleven future slots free.
- One past, unbooked slot for testing the future-time rule.
- One cancelled booking for the current applicant, with its slot free.

Times are relative to startup so the fixtures do not expire in source control.
Thirty minutes is a fixture setting in the initializer, not a finalized product
duration. Schema and seeds are demo setup, not an implementation of booking rules.

## Exercise entry points

| Package | Start here |
| --- | --- |
| `domain` | Applicant, Slot with booked flag, Booking with status and JPA version |
| `api` / `api.dto` | Controller routes and starter DTOs; add delegation/input handling |
| `service` | BookingService placeholders for the operations |
| `persistence` | JpaRepository CRUD plus custom query/claim/release placeholders |
| `config` | Seed fixtures and simulated identity |

Repository default methods throw `UnsupportedOperationException` to allow startup
without supplying the exercise queries. Replace them with suitable JPA query
declarations (`@Query`, `@Modifying`) or implementations when you do that exercise.

**Start with `BookingService.createBooking`**, using Java-like pseudocode before
implementing persistence. It accepts an internal key argument without deciding
whether HTTP supplies that key in a header or body.

Still to implement: idempotency record/acquisition/replay, conditional slot claim,
one-active-booking-per-applicant enforcement, transactional mutations, DTO mapping,
client-version checking and error handling. `@Version` alone does not implement
that entire concurrency contract. The update request intentionally has TODOs for
version metadata; the creation request has TODOs for idempotency transport.

The startup test verifies JPA mappings and fixture consistency. It is not a booking
correctness test, a race test, or evidence of learner-independent implementation.
