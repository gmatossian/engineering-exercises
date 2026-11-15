# Incident API: frontend integration contract

Start here when building the UI. This package describes the existing backend;
mockup field names, sample facilities and prototype scripts are not its contract.

- [OpenAPI 3.1 specification](openapi.yaml): operations, parameters, schemas,
  enums, request bodies, response media types and status codes.
- [Captured JSON examples](examples/): actual responses from an isolated backend
  instance, with fresh seed data.
- [Capture manifest](capture-manifest.json): request method, path, body, response
  status and media type for every example. Entries are in execution order.
- [Executable requests](../../requests.http): run these in IntelliJ or another
  compatible HTTP client.

The specification is a checked-in document, not a runtime `/v3/api-docs` endpoint.
It was prepared from the Java implementation and verified against captured
responses. Update it alongside API changes; there is no automatic code-to-spec
synchronization. The implementation remains the authority if drift is found.

## Run and connect

Requires Java 21. From the repository root:

```sh
cd incident-api/backend
./mvnw spring-boot:run
```

Base URL: `http://127.0.0.1:8081`. `GET /actuator/health` verifies startup.
The database is in memory; restarting the backend restores the fixtures.

There is currently no authentication flow, token, session cookie or login UI.
The server uses a fixed demo access scope (`site-a`, `site-b`) and actor
`demo-user`. `site-c` exists but is forbidden. These are exercise stand-ins,
not production authentication or authorization configuration.

CORS is not configured. For a separately served Angular app, use a development
proxy for `/incidents` (and `/actuator` if used), pointing to the backend, and
make relative HTTP calls through the frontend origin. Direct cross-origin
browser calls need explicit backend CORS configuration; none is added here.

## Operations

| Method/path | Input | Success |
| --- | --- | --- |
| `GET /incidents` | Optional `siteId`, `severity`, `limit`, `cursor` | Summary list plus `nextCursor` |
| `GET /incidents/{id}` | Numeric incident ID | Detail object with description/history |
| `PATCH /incidents/{id}` | JSON body such as `{"status":"ACKNOWLEDGED"}` | Updated detail object |

See OpenAPI for exact field names and types. IDs are JSON numbers, not strings
such as `INC-8492`; a UI prefix is presentation only. Timestamps are ISO-8601
instants, not relative-time strings. Format them in the UI with an explicit
local/selected time-zone policy; do not append a hard-coded `CST` label.

`type` and activity `action` are strings, not closed enums. `severity` and
`status` are case-sensitive enums. History entries contain `action`, `actorId`
and `occurredAt`, not `actor` and `timestamp`.

There is no site catalogue endpoint or site display-name field. For this demo,
configure the two accessible IDs in the UI (for example labels “Site A” and
“Site B”). Do not populate the filter from only the currently loaded incidents,
and do not invent a backend route for the mockup's facility names.

## Listing, filtering and pagination

- The list contains **OPEN incidents only**, across authorized sites. Omit
  `siteId` for all authorized sites and `severity` for all severities; do not
  send UI labels such as `All Sites` as parameter values.
- Filtering happens on the backend before pagination. There are no status,
  type, date-range or selectable-sort parameters in this version.
- Ordering is fixed: `occurredAt DESC, id DESC`. ID breaks timestamp ties.
- `limit` is a page size: default 20, minimum 1, maximum 100.
- Omit `cursor` on the first request. Append the next page using the previous
  `nextCursor` unchanged, retaining the same filters and ordering.
- `nextCursor: null` means no further page. Do not send `cursor=null` or an empty
  cursor string. An empty result is a successful 200 response with
  `incidents: []` and `nextCursor: null`.
- Filter changes, Clear filters and Refresh start a new sequence: discard the
  cursor and replace the loaded list. Load more appends instead.
- There are no total/remaining counts or page numbers. Display the number
  actually loaded and enable Load more only when a next cursor exists.

Cursors are opaque to the UI. Internally they are simple Base64URL continuation
positions, without signatures, filter binding, expiry or server-side storage.
The backend rejects malformed tokens but does not reject a valid token reused
with different filters. Resetting on filter changes is a client responsibility.
Requests read current data, not a snapshot. A refresh is needed to retrieve
newer incidents; concurrent changes can alter which incidents still match.

## Details and status changes

Fetch details when opening the sheet; list summaries do not include description
or activity history. Details can represent any status. History is oldest first,
with ties ordered by an internal activity ID; an empty history is valid.

| Current status | Available changes |
| --- | --- |
| `OPEN` | `ACKNOWLEDGED` or `RESOLVED` |
| `ACKNOWLEDGED` | `RESOLVED` |
| `RESOLVED` | None; terminal |

Setting the current status succeeds without adding another activity. This is
same-status retry behaviour, not general idempotency-key support. Retrying an
older acknowledgement after another caller resolved the incident can return 409.

Disable mutation controls while saving. On success, use the returned details
for status and history, remove the incident from the OPEN list, and keep the
sheet available so the user can inspect the result or resolve an acknowledged
incident. Do not fabricate activity entries, actor IDs or timestamps in the UI.

Status and history changes share a transaction. A conditional database update
can detect a concurrent state change and return 409. There is no client version,
ETag, `If-Match` or `Idempotency-Key` contract, so this does not detect every stale
browser view. On 409, reload details and let the user reconsider the action.

## Errors and UI states

| Status | Meaning and handling |
| --- | --- |
| 400 | Invalid limit/cursor/enum/path ID, missing status or malformed JSON; correct the request |
| 403 | Requested site or incident is outside the demo scope; show an access error |
| 404 | Numeric incident ID was not found; show unavailable/not found |
| 409 | Forbidden transition or concurrent status change; reload details |
| 5xx/network failure | Show an error and a retry option; preserve useful existing UI state |

Application errors use `application/problem+json` with `status`, `title`,
`detail` and `instance`. Some framework errors (captured unknown status and
malformed JSON) instead use `application/json` with `timestamp`, `status`,
`error` and `path`. Read `detail` when present, otherwise `error`, then use a
friendly fallback. Do not assume every error body has the same shape or is JSON.
There is no 401/login behaviour in this version.

Support initial loading, loading another page, detail loading, saving, empty
results, empty history and recoverable errors. Ignore/discard stale responses
when filters or the selected incident change; prevent overlapping Load more or
save requests from corrupting the current state.

## Examples and verification

Captured on 2026-11-14 (America/Los_Angeles) using a temporary process and fresh
in-memory database. Its ephemeral port is intentionally absent from the
manifest; use the documented base URL when replaying requests. The temporary
process was stopped. The IDE-started application's database was not changed.

- `incident-search`, `incident-search-next`, `incident-search-final`: one
  filtered sequence (`site-a`, `HIGH`, size 3), returning 3 + 3 + 2 records.
- `incident-search-empty`: a syntactically valid old boundary produces no rows.
- `incident-details`, `incident-details-empty-history`: populated/empty history.
- `incident-updated`, `incident-update-retry`, `incident-resolved`: ordered
  mutations of incident 1, including an unchanged acknowledgement retry.
- Remaining examples demonstrate health and the documented error formats.

JSON files are response bodies only. Capture-time activity/error timestamps are
examples, not fixed values a future run must reproduce. Follow the manifest's
execution order to reproduce mutation results on a fresh database.

Validation included OpenAPI structure, local references, every captured response
against its declared schema/media type, pagination continuity/final-page null,
and unchanged detail/history on the same-status retry. No backend behaviour or
frontend implementation was changed to create this package.

For contract changes, review the [controller](../../src/main/java/com/gmatossian/practice/incidents/api/IncidentController.java),
[DTOs](../../src/main/java/com/gmatossian/practice/incidents/api/dto/),
[service](../../src/main/java/com/gmatossian/practice/incidents/service/IncidentService.java)
and [error handler](../../src/main/java/com/gmatossian/practice/incidents/api/error/IncidentExceptionHandler.java),
update the spec, and recapture affected examples in an isolated instance.
