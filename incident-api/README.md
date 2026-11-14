# Incident API exercise

A small incident-management API, built in incremental, runnable checkpoints.
This history is a **reconstructed development walkthrough** of an existing,
agent-assisted exercise, not a record of the original edit sequence or an
independent/timed assessment. Commits retain their actual creation dates.

## Current checkpoint

**6. Implement transactional status updates**

Each checkpoint is intended to compile and pass its applicable tests. The
complete sequence introduces the scaffold, model, database, list endpoint,
detail endpoint and status update in that order.

## Run

Prerequisite: a JDK 21 installation selected in `JAVA_HOME` (verified with
Temurin 21). Maven is supplied by the wrapper (3.10.0); Spring Boot is 4.1.2.
From this directory:

```sh
./mvnw test
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd`. The first run needs network access to download
Maven/dependencies. Subsequent runs can use `./mvnw --offline test` if cached.
The application binds to `127.0.0.1:8081`; `/actuator/health` verifies startup.
Use the requests available at this checkpoint in [requests.http](requests.http).

## Available at this checkpoint

- Java 21 / Spring Boot application, Web MVC, Validation and Actuator; one context-load test. No incident endpoint or database yet.
- Incident and activity records, severity/status enums, absolute timestamps (`Instant`). The domain model has no ORM dependency.
- Embedded in-memory H2 with Spring JDBC, explicit schema and deterministic fixtures: 96 incidents, three sites, all severity/status values, tied timestamps and selected activity histories. Each restart restores the seed data.
- `GET /incidents`: OPEN incidents, optional site/severity filters, default limit 20 (1–100), descending occurrence-time/ID ordering and opaque cursor continuation. The response contains incident summaries and `nextCursor`; the final page has a null cursor. The repository fetches one extra record to detect continuation. Fixed demo access allows site-a/site-b; site-c is forbidden. Validation errors are 400 and forbidden sites 403.
- `GET /incidents/{id}`: any-status details, description and chronological activity history. Missing incidents are 404; unauthorized incidents or empty access scope are 403. Domain objects, internal search projections and HTTP DTOs remain separate.
- `PATCH /incidents/{id}`: OPEN → ACKNOWLEDGED/RESOLVED; ACKNOWLEDGED → RESOLVED; no reopening. Requesting the current status is a successful no-op. Conditional SQL checks the previously read status; a mismatch or forbidden transition is 409. Missing/null status and malformed input are 400. The status update and history insert share one service transaction; failure rolls both back. The fixed actor is `demo-user`.

Checkpoint verification target: **64 passing tests**. Verification covers the current features, with further tests introduced alongside later endpoints.

## Scope and limitations

- This is a local learning exercise with fictional fixture data, not production software.
- Fixed demo access is not authentication. There is no user-management/security setup.
- The list is deliberately OPEN-only; acknowledged/resolved incidents are available by ID once the detail endpoint exists.
- Cursors are URL-safe Base64 of `id|timestamp`, not encryption. There is no signature, filter fingerprint, expiry or snapshot. Reset the cursor when filters change. Loading more retrieves older results; refresh starts again for newer results.
- Filtering/pagination use current data. Updates can change which incidents match while browsing.
- No total/remaining counts, numbered pages, live push feed or UI are implemented.
- The conditional update checks server-read status, not a client-supplied version/ETag. It does not detect every kind of stale browser view.

Tags: `java`, `spring-boot`, `spring-mvc`, `rest-api`, `filtering`, `cursor-pagination`, `spring-jdbc`, `jdbc-client`, `h2`, `in-memory-database`, `transactions`, `conditional-update`, `activity-history`, `exception-handling`, `mockmvc`.
