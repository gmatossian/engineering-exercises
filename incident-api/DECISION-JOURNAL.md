# Exercise decisions and discussion notes

[Pagination](#pagination) · [Cursors](#cursor-validation-and-hardening) · [Data](#data-and-persistence) · [Concurrency](#concurrency--optimistic-locking) · [Retries](#retries-and-transactions) · [Models](#models-and-retrieval) · [Updates](#updates-and-errors) · [Authorization](#authorization) · [Schema](#database-constraints-and-indexes)

## Pagination

| Aspect | Used here | Reason |
| --- | --- | --- |
| Strategy | Cursor-based rather than page/size | Avoid offset shifts when newer incidents arrive ahead of the current page |
| Ordering | `occurredAt DESC, id DESC` | ID breaks timestamp ties |
| Position | Last returned timestamp + ID | Identify exactly where the next batch continues |
| End detection | Fetch `limit + 1`; return at most `limit` | Detect another page without counting all matches |
| Next cursor | Built from the last **returned** record; `null` on the final page | The extra record must remain available for the next request |
| Page size | Default **20**; range **1–100** | Bound the work per request |
| Filtering | Backend filters → sorts → paginates | Filtering only loaded records could miss matches on other pages |

> **Tradeoffs:** no direct jump to an arbitrary page and no snapshot guarantee.
> Updates can change matching results. **Refresh** starts from the top;
> **Load more** continues toward older records.

---

## Cursor validation and hardening

**Implemented**

- URL-safe Base64 of `id|timestamp`; opaque to the client, no server-side cursor storage.
- Decode and validate structure, parseable ID and timestamp.
- Client returns the token unchanged and resets it when filters change.

**Deliberately omitted** — simplified after the initial implementation added too much machinery:

| Mechanism | What it would provide | Reconsider when… |
| --- | --- | --- |
| Filter/order fingerprint | Detect reuse with a different search; possibly a hash of normalized filters/order | The server should enforce search compatibility |
| Signature | Detect token modification using a secret signing key | The server must verify it issued the encoded values |
| Expiry / snapshot state | Not implemented | Requirements call for bounded token lifetime or a stable result view |

> **Encoding ≠ encryption.** Signing does not hide the contents. A fingerprint
> alone is not a security boundary. Neither mechanism replaces authorization.

---

## Data and persistence

| Choice | Fit for this exercise | Tradeoff |
| --- | --- | --- |
| **H2 in memory** | Real SQL, constraints, indexes and transactions without an external database | Changes disappear on restart |
| **Seed SQL** | Repeatable filters, timestamp ties, multiple pages and activity histories | Fixture data rather than durable user data |
| **Spring JDBC (`JdbcClient`)** | Practise explicit SQL without introducing ORM behaviour | More manual query and mapping code |
| **Repository interface + implementation** | Separate the repository contract from JDBC details | No Spring Data-generated implementation |

**Alternatives discussed**

- **Java map:** would need filtering, ordering and equivalent transactional behaviour implemented in Java.
- **External database:** reconsider for durable data or behaviour specific to a target database.
- **Spring Data JPA:** could implement all current operations, including cursor pagination and conditional updates, using JPQL/JPA APIs without native queries. No feature required choosing JDBC over JPA.

> **Choice clarified:** JDBC is an exercise/scope preference, not a demonstrated
> technical advantage here. JPA offers less standard CRUD boilerplate but adds
> entity mappings and persistence-context behaviour. Given existing JPA familiarity,
> it would also have been a reasonable choice.

---

## Concurrency / optimistic locking

**Implemented: conditional update using the status read by the service**

```sql
UPDATE incidents
SET status = :newStatus
WHERE id = :id AND status = :expectedStatus
```

| Result | Meaning | Outcome |
| --- | --- | --- |
| One row updated | Status still matched the service's read | Continue with history insertion |
| Zero rows updated | Conditional write failed; status may have changed since the read | HTTP **409 Conflict** |

**What this is**

Limited **optimistic concurrency control based on expected status**. No version column or client version/ETag was added.

**What it does not detect**

- Changes to other fields.
- Whether the browser displayed an older state than the service just read.

**When to reconsider**

- **Version check:** relevant changes extend beyond status.
- **Client version / ETag:** compare against what the user actually saw.

---

## Retries and transactions

### Retry behaviour

| Situation | Response | Side effects |
| --- | --- | --- |
| First acknowledgement saved, response lost; same status requested again | **200**, current details | No second update or activity entry |
| Incident resolved by another caller; old acknowledgement retried | **409** | No backward transition |

> **Limit:** same-status retry handling is not an idempotency-key mechanism.

### Transaction boundary

**Service-owned `@Transactional`:** status update + history insert.

- **Both succeed:** commit both.
- **History insert fails:** roll back the status change too.
- Repository methods do not manually manage independent transactions.

---

## Models and retrieval

| Choice | Reason |
| --- | --- |
| Complete domain `Incident` includes description/history | Details belong in the complete model |
| Internal repository `IncidentSummary` projection | Avoid loading detail/history for every list item |
| Service maps projection → HTTP DTO | Keep persistence results separate from API contracts |
| Independent summary/detail response types | Can evolve separately; no inheritance needed |
| Wrapper for list only | List needs incidents + cursor; details return one object |
| Two detail queries: incident, then history | Reasonable for one incident; avoid repeated history queries across the list |
| `Instant` rather than `LocalDateTime` | Represents an occurrence on the timeline; UI chooses display timezone |

---

## Updates and errors

| Decision | Reason / behaviour |
| --- | --- |
| **PATCH status rather than DELETE** | Acknowledgement/resolution fits the UI |
| **PATCH rather than PUT** | Partial update rather than replacement semantics |
| **Global exception handling** | Service throws application exceptions; controller advice maps them to HTTP |

**Transitions — exercise assumptions**

| Current status | Allowed next status |
| --- | --- |
| `OPEN` | `ACKNOWLEDGED` or `RESOLVED` |
| `ACKNOWLEDGED` | `RESOLVED` |
| `RESOLVED` | None; no reopening |

**Error distinction:** **400** = invalid input; **409** = requested transition conflicts with current state.

---

## Authorization

| Choice | Consequence |
| --- | --- |
| Server supplies fixed demo scope: `site-a`, `site-b` | Real authentication remains outside this exercise |
| Omitted site filter means all **authorized** sites | Scope still applies; a cursor never grants access |
| Existing forbidden incident → **403**; missing incident → **404** | Distinction can reveal existence |
| Empty detail-access scope → **403** before lookup | No incident lookup needed |

---

## Database constraints and indexes

| Mechanism | Purpose / reminder |
| --- | --- |
| `CHECK` | Enforce allowed enum names; keep SQL and Java enums aligned manually |
| `ON DELETE CASCADE` | Parent deletion removes activities; database behaviour, separate from ORM cascades. No DELETE endpoint was added |
| Occurrence-time/ID index | Support list ordering |
| Incident-ID/activity-time index | Support history retrieval |
