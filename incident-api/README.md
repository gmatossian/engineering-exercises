# Incident API exercise

A small incident-management API, built in incremental, runnable checkpoints.
This history is a **reconstructed development walkthrough** of an existing,
agent-assisted exercise, not a record of the original edit sequence or an
independent/timed assessment. Commits retain their actual creation dates.

See the [exercise decision notes](DECISION-JOURNAL.md) for short summaries of
pagination, persistence, concurrency and other choices discussed during the exercise.

## Current checkpoint

**6. Implement transactional status updates**

Each checkpoint is intended to compile and pass its applicable tests. The
complete sequence introduces the scaffold, model, database, list endpoint,
detail endpoint and status update in that order.

## Project layout

```text
incident-api/
  README.md
  backend/
    pom.xml
    mvnw
    src/
    requests.http
  frontend/
    .gitkeep
```

The Spring Boot application lives in `backend/`. `frontend/` is reserved for a
future UI and contains only an empty `.gitkeep`, because Git does not track empty
directories. No UI, frontend framework, dependencies or build setup is present.
The six historical checkpoints below predate this directory split; their
snapshot links retain the original layout.

## Run

Prerequisite: a JDK 21 installation selected in `JAVA_HOME` (verified with
Temurin 21). Maven is supplied by the wrapper (3.10.0); Spring Boot is 4.1.2.
From this project directory:

```sh
cd backend
./mvnw test
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd`. The first run needs network access to download
Maven/dependencies. Subsequent runs can use `./mvnw --offline test` if cached.
The application binds to `127.0.0.1:8081`; `/actuator/health` verifies startup.
Use the requests available at this checkpoint in [requests.http](backend/requests.http).

## Available at this checkpoint

- Java 21 / Spring Boot application, Web MVC, Validation and Actuator, with fixture, repository, service, codec and MVC tests.
- Incident and activity records, severity/status enums, absolute timestamps (`Instant`). The domain model has no ORM dependency.
- Embedded in-memory H2 with Spring JDBC, explicit schema and deterministic fixtures: 96 incidents, three sites, all severity/status values, tied timestamps and selected activity histories. Each restart restores the seed data.
- `GET /incidents`: OPEN incidents, optional site/severity filters, default limit 20 (1–100), descending occurrence-time/ID ordering and opaque cursor continuation. The response contains incident summaries and `nextCursor`; the final page has a null cursor. The repository fetches one extra record to detect continuation. Fixed demo access allows site-a/site-b; site-c is forbidden. Validation errors are 400 and forbidden sites 403.
- `GET /incidents/{id}`: any-status details, description and chronological activity history. Missing incidents are 404; unauthorized incidents or empty access scope are 403. Domain objects, internal search projections and HTTP DTOs remain separate.
- `PATCH /incidents/{id}`: OPEN → ACKNOWLEDGED/RESOLVED; ACKNOWLEDGED → RESOLVED; no reopening. Requesting the current status is a successful no-op. Conditional SQL checks the previously read status; a mismatch or forbidden transition is 409. Missing/null status and malformed input are 400. The status update and history insert share one service transaction; failure rolls both back. The fixed actor is `demo-user`.

Final checkpoint verified with **64 passing tests**, zero failures/errors/skips. The executable JAR also builds successfully.

## Scope and limitations

- This is a local learning exercise with fictional fixture data, not production software.
- Fixed demo access is not authentication. There is no user-management/security setup.
- The list is deliberately OPEN-only; acknowledged/resolved incidents are available by ID.
- Cursors are URL-safe Base64 of `id|timestamp`, not encryption. There is no signature, filter fingerprint, expiry or snapshot. Reset the cursor when filters change. Loading more retrieves older results; refresh starts again for newer results.
- Filtering/pagination use current data. Updates can change which incidents match while browsing.
- No total/remaining counts, numbered pages, live push feed or UI are implemented.
- The conditional update checks server-read status, not a client-supplied version/ETag. It does not detect every kind of stale browser view.

Tags: `java`, `spring-boot`, `spring-mvc`, `rest-api`, `filtering`, `cursor-pagination`, `spring-jdbc`, `jdbc-client`, `h2`, `in-memory-database`, `transactions`, `conditional-update`, `activity-history`, `exception-handling`, `mockmvc`.

## Development walkthrough

The following commits reconstruct logical implementation steps. Each checkpoint
was assembled from the existing exercise and tested before its commit; changes
inside shared controller/service/repository files are introduced with the
feature that needs them. The sequence is not the original chronological history.

| Step | Changes | Code at this checkpoint | Passing tests |
| --- | --- | --- | --- |
| 1 | [create Spring Boot scaffold](https://github.com/gmatossian/engineering-exercises/commit/01a8fa9eedf4cf68a06fb968a09b85b6402caa7d) | [Browse snapshot](https://github.com/gmatossian/engineering-exercises/tree/01a8fa9eedf4cf68a06fb968a09b85b6402caa7d/incident-api) | 1 |
| 2 | [add incident domain model](https://github.com/gmatossian/engineering-exercises/commit/8f5cd824820974bf5c7deb8bf833e7c4c855eacb) | [Browse snapshot](https://github.com/gmatossian/engineering-exercises/tree/8f5cd824820974bf5c7deb8bf833e7c4c855eacb/incident-api) | 1 |
| 3 | [configure H2 persistence and fixtures](https://github.com/gmatossian/engineering-exercises/commit/9944d8bb031d02f83144a51e28a60b0b0184e141) | [Browse snapshot](https://github.com/gmatossian/engineering-exercises/tree/9944d8bb031d02f83144a51e28a60b0b0184e141/incident-api) | 3 |
| 4 | [implement filtered search and cursor pagination](https://github.com/gmatossian/engineering-exercises/commit/6f5a4870b9159ebb23e23fa86fe857ece5fb434a) | [Browse snapshot](https://github.com/gmatossian/engineering-exercises/tree/6f5a4870b9159ebb23e23fa86fe857ece5fb434a/incident-api) | 42 |
| 5 | [implement incident details and activity history](https://github.com/gmatossian/engineering-exercises/commit/05d9dd33c8d15a8c3b4f750122691a5f1f5315e9) | [Browse snapshot](https://github.com/gmatossian/engineering-exercises/tree/05d9dd33c8d15a8c3b4f750122691a5f1f5315e9/incident-api) | 55 |
| 6 | [implement transactional status updates](https://github.com/gmatossian/engineering-exercises/commit/37e1b7252d6849ec7322f3a3cda2bee94c514af2) | [Browse snapshot](https://github.com/gmatossian/engineering-exercises/tree/37e1b7252d6849ec7322f3a3cda2bee94c514af2/incident-api) | 64 |

The first two checkpoints have one application context-load test each; this does
not establish comprehensive domain-model test coverage. Later checkpoints add
fixture, JDBC, service, codec and MVC behavior tests alongside their features.
All checkpoints were tested on Temurin Java 21 using the Maven wrapper with
cached dependencies (`--offline`). The final checkpoint also passed `verify`.

A separate packaged-JAR smoke check verified health, filtered pagination and
continuation, incident details, 400/403/404 errors, acknowledgement, same-status
retry without duplicate history, resolution and a forbidden transition (409).
That process used an isolated in-memory database and was stopped afterward.

### Reviewing a step

Use a change link above for its diff, or a snapshot link for the runnable project
at that step. Locally, from the repository root, inspect a commit with:

```sh
git show <commit> -- incident-api/
```

Keep these commits when merging this walkthrough: use a merge commit or rebase
merge, not squash merge. Future work can add ordinary incremental commits.

### Publishing cleanup

The final Java source and tests are byte-identical to the working exercise.
The POM, application configuration, schema and wrapper are preserved. Publishing
changes are limited to portable README documentation, corrected/expanded HTTP
request examples and a trailing-blank-line cleanup in the seed SQL. Local IDE
settings, a machine-specific run configuration, build output and private
interview/application material are excluded. Fixtures are fictional; the empty
H2 password belongs only to the embedded local demo database.
