# Incident API frontend implementation-readiness analysis

## Analysis basis and scope preservation

This analysis is grounded in the exact approved Refine artifact `ec3172c1-e6a8-4819-884a-161055433ef3` (fingerprint `29bdee0e7328c619df7ade575c1f546571efdc3fa9b832def36802f14a3d60dd`). It is an Analyze-stage readiness report, not a design or implementation decision.

**Approved contract preserved:** AC1–AC9 and S1–S8 remain unchanged. In particular, the UI remains an `OPEN`-incident browser with site and severity filters, cursor pagination, fetched detail/history, the three allowed status transitions, contextual states, stale-response protection, and conflict reload. The selected presentation remains exactly `site-a` → “Site A,” `site-b` → “Site B,” `LOW`/`MEDIUM`/`HIGH` only, viewer-local unambiguous zoned timestamps, optional relative text only for occurrence times, absolute zoned history times, and a detail sheet that stays open after a successful mutation. The approved exclusions also remain unchanged.

**Not decided here:** frontend technology, packages, state-management library, testing framework, component architecture, URL-state policy, scaffolding, page size within the API's allowed range, exact timestamp formatting pattern, or framework-specific proxy configuration. These are downstream choices and may not weaken the approved behavior or evidence.

## 1. Repository starting state and locally available assets

### Repository facts

- `incident-api/README.md:19-44` says the frontend is reserved for a future UI and has no UI, framework, dependencies, or build setup. Static inspection agrees: the only file directly under `incident-api/frontend/` is `.gitkeep`; there is no frontend package manifest, source tree, build configuration, or test configuration.
- The same frontend directory also contains reference material under `design/`: `design/DESIGN.md`, four desktop/mobile list/detail `screen.png` files, their four `code.html` prototypes, and `mockups/obsidian_sentinel/DESIGN.md`. These are visual references, not an application scaffold or an API definition.
- `incident-api/README.md:46-70` documents the runnable backend: Java 21, the Maven wrapper, Spring Boot on `127.0.0.1:8081`, and deterministic H2 seed data. `backend/src/main/resources/application.properties:1-11` confirms the loopback binding, port, in-memory JDBC URL, and schema/data initialization.
- The local integration package is complete enough for static consumer work: `backend/docs/api/README.md`, `openapi.yaml`, `capture-manifest.json`, 20 captured response bodies under `examples/`, and `backend/requests.http`. The manifest records method, path, request body, status, media type, and execution order.
- The visual prototypes contain useful responsive composition cues but also deliberately non-contract content: invented facilities, display-only `INC-` identifiers, hard-coded `CST`, invented incident/activity prose, `CRITICAL`/“High & Critical” in one prototype, and prototype-only status behavior. The approved contract, not those values or scripts, controls implementation.

### Analysis conclusion

There is no existing frontend code to extend. Technology selection and scaffolding are genuine prerequisites. Once those are separately authorized, the checked-in OpenAPI, captures, manifest, deterministic seed data, requests file, and desktop/mobile references are sufficient to begin consumer implementation without first changing the backend.

## 2. API-to-UI mappings required by AC1–AC9

Local evidence for this section is `backend/docs/api/README.md:42-136`, `openapi.yaml:17-240` and `openapi.yaml:259-424`, plus the manifest and named captures.

### Requests and sequence rules

| UI intent | HTTP mapping | Required client rule | Criteria |
| --- | --- | --- | --- |
| Initial list, filter change, Clear, Refresh | `GET /incidents` with optional `siteId`, optional `severity`, optional `limit`; no `cursor` | Omit “All” parameters. A selector change replaces from a cursor-free request. Clear omits both filters. Refresh retains selected filters but omits the cursor. | AC1, AC2, AC6 |
| Load more | `GET /incidents` with the same filters and previous non-null `nextCursor` passed unchanged as `cursor` | Append only; one append request at a time. Do not send `cursor=null`, an empty cursor, or a cursor from another filter sequence. | AC2, AC6, AC7 |
| Open/reload detail | `GET /incidents/{id}` using the numeric ID | Fetch on open and on explicit detail retry/conflict reload. The `INC-` prefix, if shown, is never sent. | AC3, AC6, AC7, AC8 |
| Change status | `PATCH /incidents/{id}` with JSON containing only `{"status":"ACKNOWLEDGED"}` or `{"status":"RESOLVED"}` as valid for the returned current status | Send exactly one request per action; do not send actor/history/timestamps; disable all mutation controls until settlement. | AC4, AC5, AC6, AC8 |

The API's list order is fixed at `occurredAt DESC, id DESC`; filters are applied before pagination. `limit` defaults to 20 and accepts 1–100. Cursors are opaque, are not bound to filters by the server, and represent current-data continuation rather than a snapshot (`README.md:64-88`; `openapi.yaml:17-58`). The client therefore owns sequence isolation.

### Success DTO and presentation mapping

| API value | UI use | Contract constraint |
| --- | --- | --- |
| Summary `{id, siteId, type, severity, status, occurredAt}` | List row/card | Show every required field. Use returned ordering; do not sort client-side. `type` is an open string. |
| Search `{incidents, nextCursor}` | Replace or append list and set continuation state | Loaded count is `incidents` currently retained, not a total. `nextCursor: null` means explicit completion/end state. Empty array plus null is a successful empty state. |
| Detail `{id, siteId, type, severity, status, occurredAt, description, activityHistory}` | Sheet content and post-mutation replacement | Treat the detail response as authoritative and complete; do not merge fabricated history or descriptions. |
| Activity `{action, actorId, occurredAt}` | Chronological history entry | Render returned values oldest first. `action` is an open string. Empty history is valid and gets an in-sheet empty state. |
| `siteId` | Frontend-configured label | Only `site-a` → “Site A” and `site-b` → “Site B.” No site-catalogue request and no labels sent to the API. |
| `severity` | Filter and badge/value | Only case-sensitive `LOW`, `MEDIUM`, `HIGH`; never `CRITICAL` or a grouped mockup value. |
| `status` | Status display and allowed-action derivation | `OPEN`: Acknowledge or Resolve; `ACKNOWLEDGED`: Resolve; `RESOLVED`: none. Never expose reopening. |
| ISO-8601 timestamp instant | Occurrence/history presentation | Convert for display to the viewer's local zone and include an unambiguous date, time, and zone. Occurrence may additionally have relative text; history may not be relative-only. Never append hard-coded `CST`. |

`incident-search.json`, `incident-search-next.json`, and `incident-search-final.json` show an ordered 3+3+2 filtered sequence with a final null cursor. `incident-search-empty.json` shows the successful empty shape. `incident-details.json` and `incident-details-empty-history.json` show populated and empty histories. `incident-updated.json`, `incident-update-retry.json`, and `incident-resolved.json` show complete returned detail and server-generated history after mutations.

### Error mapping

Implement one defensive error normalizer with these inputs: HTTP status (when available), media type (when available), safely parsed body (when possible), and transport failure. Prefer a non-empty `detail`, otherwise non-empty `error`, otherwise a friendly contextual fallback. Invalid/non-JSON bodies must not cause a second UI failure.

| Condition | Repository evidence | Required presentation/recovery |
| --- | --- | --- |
| `400` problem response | `invalid-limit.json`, `invalid-cursor.json`, `invalid-severity.json`, `invalid-id.json`, `missing-status.json` | Contextual request error. These normally indicate a client/configuration defect; do not mislabel as authentication. |
| `400` framework response | `unknown-status.json`, `malformed-json.json` contain `error`, not `detail` | Show safe normalized text and preserve useful state. This proves the parser must support heterogeneous JSON shapes. |
| `403` | `forbidden.json` | Show access denied in list or sheet context; there is no login flow. |
| `404` | `not-found.json` | Show incident unavailable/not found in detail context, preserving any still-useful surrounding list. |
| `409` mutation conflict | `conflict.json` | Keep the sheet open and visible content useful; do not automatically retry. Offer Reload incident; a successful reload replaces detail and recomputes actions. |
| `5xx` or network failure | OpenAPI documents retryable `500`; no captured 5xx/network body exists | Show contextual retry/reload, preserve useful state, and use fallback text if no usable body exists. |

On a successful PATCH, remove the target ID from the currently displayed `OPEN` list, keep the sheet open, replace its status and full history with the returned detail, show success in context, and derive remaining actions only from the returned status. Same-status success is documented only as retry behavior; there is no general idempotency key, ETag, client version, or `If-Match` support.

## 3. Framework-neutral UI state and event model

The model below specifies observable invariants, not a state-management library or component architecture.

### State records

**List state**

- `selectedFilters`: site (`all | site-a | site-b`) and severity (`all | LOW | MEDIUM | HIGH`).
- `loadedQuery`: the filter values associated with the currently retained rows, so an error during replacement cannot make old rows appear to belong to new filters.
- `items`: ordered unique summaries; `nextCursor`; derived `loadedCount`.
- `phase`: `idle | replacing | appending | replacementError | appendError | complete | empty`.
- `listGeneration`: monotonically increasing sequence identity; `activeListRequest` includes generation, kind (`replace`/`append`), filter snapshot, and cursor snapshot.

**Detail state**

- `sheetOpen`, `selectedId`, `detail`, and `detailPhase`: `closed | loading | ready | error | reloading`.
- `detailGeneration` and `activeDetailRequest` include selected ID and request purpose (`open | retry | conflictReload`).
- Retained detail data is always tagged with its incident ID; detail for one incident must never render under another selection.

**Mutation state**

- `mutationPhase`: `idle | saving | success | error | conflict`.
- `activeMutation` includes request identity, target incident ID, source status, and requested target status.
- `mutationMessage`/normalized error belongs to that target and request. Allowed controls are derived from the latest accepted detail status, never optimistically from the clicked action.

### Events and transitions

1. **`LIST_REPLACE_REQUESTED(reason, filters)`** — used for initial load, site/severity change, Clear, and Refresh. Increment `listGeneration`; invalidate or abort the older list request; snapshot filters; clear the active cursor; enter `replacing`. Refresh uses current filters, Clear uses both `all`, and selector changes use the new selection. The previous successful rows may be retained as useful data during loading/error only if they remain tagged with their old query and are not represented as results for the new query.
2. **`LIST_REPLACE_SUCCEEDED(request, page)`** — accept only if request identity, generation, and filter snapshot still match. Replace (never append) with the returned ordered rows, set `nextCursor`, and enter `empty`, `complete`, or `idle` according to the response.
3. **`LIST_APPEND_REQUESTED`** — allowed only with a non-null cursor, no active replace/append, and unchanged loaded query/selected filters. Snapshot generation, filters, and cursor; enter `appending` without clearing rows.
4. **`LIST_APPEND_SUCCEEDED(request, page)`** — accept only if request identity, generation, filter snapshot, and starting cursor still match. Append in server order, preserving existing order; use numeric ID as stable render identity and prevent duplicate insertion without re-sorting. Replace `nextCursor`; null enters `complete` and exposes the approved end state.
5. **`LIST_REQUEST_FAILED`** — accept only for the still-current request. A replacement error is contextual to the attempted query; an append error preserves rows and cursor so the same continuation can be retried. A late failure is discarded just like a late success.
6. **`DETAIL_SELECTED(id)`** — open the sheet, increment `detailGeneration`, invalidate/abort an older detail request, set `selectedId=id`, and fetch. Do not show another incident's retained detail as this incident's content.
7. **`DETAIL_SUCCEEDED/FAILED(request, result)`** — accept only if sheet lifecycle, selected ID, generation, and request identity still match. On success replace the complete detail and derive controls; on failure retain useful same-incident content where present and expose retry.
8. **`STATUS_SUBMITTED(targetStatus)`** — valid only from `ready`, for a transition in AC4, with no active mutation. Capture the target ID and source status, enter `saving`, and disable all mutation controls. No second click or alternate action may create another PATCH.
9. **`STATUS_SUCCEEDED(request, returnedDetail)`** — accept the mutation result only for its stable request/target identity. Remove that ID from `items`; invalidate any older in-flight list response so it cannot reintroduce the row. Keep/pin the target sheet open, replace detail with the entire returned object, show success, and recompute actions from returned status. Do not manufacture a history entry.
10. **`STATUS_FAILED(request, error)`** — for non-409 failure, retain the known detail and restore only the controls valid for its still-known status; expose contextual retry. For `409`, enter `conflict`, keep the sheet and useful content, expose only Reload incident for recovery, and do not resubmit automatically.
11. **`CONFLICT_RELOAD_REQUESTED`** — issue a new GET for the same target with a new detail request identity and `reloading` state. On success replace complete detail, clear conflict state, and derive actions anew. The operator must make a new action choice.
12. **`SHEET_CLOSED` / selection change** — invalidate outstanding detail results. The eventual implementation must also ensure a save cannot be applied to another selection or violate the approved keep-open-on-success behavior; exact interaction treatment while saving is a downstream design choice, but isolation by target identity is mandatory.

### Core invariants

- Only the latest matching list generation may replace/append; cancellation alone is insufficient because a response can win the abort race.
- At most one append and one status mutation are active in their respective domains. A replacement supersedes any append.
- Each response carries enough captured identity to prove it still belongs to current state before reducing it.
- Numeric incident ID is the stable identity across list, detail, and mutation state.
- A mutation's global effect (removing its target from the OPEN list) is keyed to the mutation target; its sheet effect is never applied to a different incident.
- Client-side suppression/invalidation after a successful mutation must cover list responses that began before the PATCH completed; otherwise an old response can reinsert the no-longer-OPEN incident.

## 4. Concurrency and race risks

| Risk | Consequence | Framework-neutral mitigation requirement |
| --- | --- | --- |
| Filter A response arrives after filter B | Wrong rows/cursor under current selectors | Generation plus filter-snapshot equality; discard both stale success and stale error. |
| Refresh/clear overlaps Load more | Old page appends to a new sequence | Replacement increments generation and invalidates append; append reducer verifies original cursor and query. |
| Repeated Load more | Duplicate requests/rows and cursor advancement races | Synchronous in-flight guard before dispatch; disable or suppress trigger until settlement. |
| Incident A detail arrives after selecting B or closing | Wrong detail in sheet | Selection generation + incident ID + open lifecycle checks; optional transport abort only as an optimization. |
| Double-click or alternate status action while saving | Multiple PATCHes and misleading history/actions | Set saving guard before dispatch and disable all mutation controls; one request identity. |
| Successful PATCH races an earlier list response | Removed row reappears | Invalidate older list generation on mutation success or apply an equivalent target-ID suppression rule before accepting rows. No automatic backend refetch is required. |
| Sheet lifecycle changes during save | Result applies to wrong selection or success closes/loses approved sheet | Pin/associate mutation with target ID; isolate global and sheet effects; preserve keep-open success semantics. Exact control behavior is deferred. |
| 409 followed by an eager retry | Repeats an obsolete decision | Conflict state blocks mutations until explicit reload succeeds and controls are recomputed; no silent PATCH retry. |
| Current-data, non-snapshot pagination | Concurrent updates may remove matches; newly created newer records are not discovered by Load more | Preserve server cursor semantics and order; communicate that Refresh starts a new sequence. Do not promise snapshot completeness or totals. |
| Backend restart during work | Mutated data/history unexpectedly returns to seeds; old cursors/details may no longer describe the same runtime sequence | Treat restart as a new local test run; reset frontend/test state and replay manifest-ordered mutations. Do not persist assumptions across backend restarts. |
| Heterogeneous or non-JSON errors | Error handler itself fails or exposes blank/technical output | Defensive parsing by status/media/body with `detail` → `error` → friendly fallback. |

The current-data pagination limitation is a repository fact, not a frontend defect to repair. The client can prevent state corruption, but it cannot manufacture snapshot isolation, versioning, total counts, or complete concurrent-change detection without excluded backend changes.

## 5. Development proxy and local runtime constraints

### Repository facts

- The backend binds only to `127.0.0.1:8081`; health is `GET /actuator/health` (`application.properties:2-4`, API guide `:20-30`).
- CORS is not configured. The guide's Angular proxy is explicitly an example for a separately served app, not a framework selection (`backend/docs/api/README.md:37-40`; `openapi.yaml:5-11`).
- The H2 database is in memory and initialized from `schema.sql`/`data.sql`; restarting restores deterministic fixtures. Captured mutation files depend on manifest execution order.
- A first backend/Maven run may need dependency downloads, but this analysis neither started the backend nor used the network.

### Implementation requirements and risks

- Whatever frontend stack is later approved must provide a development-origin proxy (or equivalent same-origin local serving arrangement) for relative `/incidents` requests. `/actuator` need only be proxied if the future frontend actually consumes health; the approved UI does not require a health feature.
- Direct browser calls from a different origin will fail absent backend CORS changes. CORS/backend changes are expressly excluded, so a frontend task must not “fix” this in backend source.
- Proxy configuration and frontend start commands cannot be specified until technology selection/scaffolding is authorized. Documentation for the selected scaffold should eventually state the two foreground local processes and the backend reset behavior.
- Tests should prefer deterministic transport fixtures for race/error timing. Live-backend walkthroughs must start from a known reset and respect mutation order; otherwise screenshots and status expectations can drift.

## 6. Verification feasibility for S1–S8

No verification was executed in this Analyze engagement. The table assesses static fixture support and identifies future frontend harness needs without changing required evidence.

| Scenario | Existing local support | Additional frontend fixture/harness need | Feasibility |
| --- | --- | --- | --- |
| S1 (AC1, AC9) | Search captures prove summary shape, fixed ordering, numeric IDs, HIGH values, and site-a; seed data contains both accessible sites and all three severities. Mockup PNGs show desktop/mobile composition only. | A deterministic all-sites/all-severities response containing both site IDs and all severities, plus a controllable viewer time zone/clock for exact zoned presentation assertions. Actual desktop/mobile screenshots remain required. | Feasible after scaffold; captures alone do not satisfy responsive demonstration. |
| S2 (AC2, AC6) | API rules and captures define cursor-free first requests and cursor use. | A request-recording fake capable of delaying and releasing responses out of order; cases for each selector, Clear, and Refresh; assertions for replacement and retained selections. | Fully automatable; no live backend needed for the critical stale-response proof. |
| S3 (AC2, AC6, AC7) | `incident-search.json` → `incident-search-next.json` → `incident-search-final.json` is an ideal 3+3+2 sequence; manifest provides exact request paths/cursors. | A sequenced fake that records calls and can hold the first append pending to test concurrent-trigger prevention. | Strong fixture support. |
| S4 (AC3, AC7, AC9) | `incident-details.json` has two oldest-first entries; `incident-details-empty-history.json` has `[]`. | Fixture routing by ID and controllable time-zone formatting assertions. | Strong fixture support. |
| S5 (AC4) | `incident-details-empty-history.json` is OPEN, `incident-details.json` is ACKNOWLEDGED, and `incident-resolved.json` is RESOLVED. | Route these as stable detail fixtures and enumerate visible/enabled actions. | Strong fixture support. |
| S6 (AC4, AC5, AC6) | Manifest-ordered `incident-updated.json` and `incident-resolved.json` support OPEN→ACKNOWLEDGED→RESOLVED; bodies and returned histories are captured. | A separate OPEN→RESOLVED response sequence/fixture, request counter/body recorder, deferred PATCH response for saving/duplicate checks, and list/detail state assertions. Reset or use a distinct target between the two paths. | Feasible; direct OPEN→RESOLVED is not separately captured. |
| S7 (AC6, AC7, AC8) | `conflict.json`, `forbidden.json`, `not-found.json`, problem-shape 400s, and `unknown-status.json`/`malformed-json.json` cover both documented JSON shapes. | A post-conflict reload detail response, representative list/detail/save 5xx fixtures, transport rejection, non-JSON/empty error body, timing control, and preserved-state assertions. | Feasible; network/5xx/non-JSON and reload sequence require frontend-only fixtures. |
| S8 (AC1–AC9) | All captures, seed data, design references, and manifest can identify data used for a walkthrough. | A completed responsive application, known backend reset or deterministic demonstration fixtures, and dated notes/screenshots or recording covering every named state and excluded discrepancy. | Feasible only after all implementation slices; remains a manual demonstration. |

The repository's 20 captures are response bodies, not a browser mock server or frontend test suite. A future harness must add delay, failure, call-recording, and sequential-response behavior; copying captures without those controls cannot prove AC6. Fixed capture timestamps/cursors need not be reproduced exactly, as the approved plan requires behavior and shape rather than those literal values.

## 7. Dependency-ordered bounded future work

These are recommended issue boundaries, not authorization to implement. Each issue should preserve the approved contract and verification plan.

1. **Select frontend technology (separate prerequisite).** Decide technology and package policy only; record compatibility with a local same-origin development proxy and the required automated/manual evidence. Do not implement product behavior in this decision issue.
2. **Scaffold the selected frontend and local proxy (separate prerequisite).** Create the authorized build/dev/test entry points, relative API base behavior, and a test seam for deterministic HTTP responses. Do not change backend/CORS, choose product scope, or introduce mock product data beyond test fixtures.
3. **Implement transport, DTO validation/mapping, and presentation primitives (AC1, AC3, AC7, AC9).** Bound to the three incident operations, defensive error normalization, configured site labels/severities, numeric IDs, and viewer-local zoned formatting. Include capture-backed contract fixtures; leave component architecture and URL policy to the separately approved technical choices.
4. **Implement list lifecycle (AC1, AC2, AC6, AC7, AC9; prepares S1–S3).** Initial load, site/severity selection, Clear, Refresh, replacement/append generations, opaque cursor handling, loaded count, empty/end/error states, and late-response rejection. Exclude search, extra filters, selectable sort, totals, polling, and backend work.
5. **Implement detail lifecycle and history (AC3, AC6, AC7, AC9; prepares S4).** Responsive sheet integration, fetched server detail, oldest-first and empty history, detail retry, timestamp/site presentation, and selection-generation guards. Exclude invented activity/facility content.
6. **Implement mutations and conflict recovery (AC4–AC8; prepares S5–S7).** Exact action matrix, one in-flight PATCH, saving/success/error states, row removal, retained sheet with returned detail, stale-list invalidation, 409 state, explicit reload, and recomputed actions. Exclude optimistic fabricated history, automatic PATCH retry, reopening, and automatic sheet dismissal.
7. **Complete responsive/contextual integration (AC1–AC9; prepares S1 and S8).** Apply the approved desktop/mobile visual references to all named loading, saving, empty, success, end, access, not-found, network/server, and conflict states. Confirm excluded prototype data/behavior is absent; do not broaden the visual system.
8. **Build and run the approved verification harness (S1–S7).** Add only the additional fixtures/timing controls identified above, retain ordered request/state evidence, and generate the automated outputs required by the approved scenarios. Testing framework selection belongs to the prior authorized technology work.
9. **Perform the approved desktop/mobile demonstrations (S1 and S8).** Use identified responses/fixtures, retain the required screenshots/recording and dated notes, and cover all named states. This is verification evidence work, not an opportunity to change scope or repair defects.

## 8. Risks, assumptions, and deferred decisions register

### Risks

- **Highest correctness risk:** stale list results after filter changes or a successful mutation. Generation checks must cover both response success and failure and must not rely only on transport cancellation.
- **High correctness risk:** mutation/detail results applied by “currently selected” identity rather than captured target identity.
- **Moderate integration risk:** a scaffold may default to direct absolute backend calls, which will fail in a browser because CORS is absent.
- **Moderate verification risk:** existing captures are strong contract fixtures but cannot simulate latency, concurrent clicks, transport failures, or non-JSON bodies by themselves.
- **Expected local-runtime risk:** backend restart resets mutations and histories; evidence collected across resets can become internally inconsistent.

### Assumptions used only for analysis

- The approved artifact remains authoritative even though its title says “Task contract” and historical draft wording discussed confirmation; the application recorded exact-version approval.
- Future implementation may transform checked-in captures into test fixtures, but no specific fixture format or test framework is assumed.
- A relative `/incidents` route through a development proxy is available after scaffolding; this is a requirement to satisfy the existing local backend constraint, not a choice of proxy technology.

### Deferred decisions

- Frontend technology, package set, scaffolding and commands.
- State-management library or no-library approach, component boundaries, and sheet/control implementation details.
- Test runner, browser/DOM harness, HTTP fake mechanism, and fixture file organization.
- URL-state versus component-local state policy.
- Page size within 1–100 and the exact localized date/time formatting pattern, provided the result remains unambiguous and zoned.
- Framework-specific proxy syntax and whether health is proxied; no backend/CORS change is permitted.

None of these deferred decisions changes AC1–AC9, S1–S8, the selected labels/timestamp policy, the API-aligned scope, or the required evidence.

## Evidence index

- Approved contract: retained artifact `ec3172c1-e6a8-4819-884a-161055433ef3`.
- Starting state/runtime: `incident-api/README.md`; `incident-api/backend/src/main/resources/application.properties`; `schema.sql`; `data.sql`.
- API behavior: `incident-api/backend/docs/api/README.md`; `openapi.yaml`; `capture-manifest.json`; `examples/*.json`; `incident-api/backend/requests.http`.
- Confirming implementation surfaces: `IncidentController.java`, `IncidentExceptionHandler.java`, DTOs, access provider, service/repository sources.
- Visual/reference assets: `incident-api/frontend/design/DESIGN.md` and the four desktop/mobile list/detail `screen.png` + `code.html` pairs.

This engagement changed no repository source, backend, contract, verification plan, Git state, or workflow selection. Its sole output is this controlled analysis artifact.
