# Task contract: Confirm Incident API frontend scope and requirements

## Proposed outcome

Define the first desktop and mobile Incident API frontend as a focused operator experience for finding currently `OPEN` incidents, inspecting server-provided details and activity, and performing the status changes supported by the existing API. Implementation issues may use this contract after the project owner explicitly confirms the resulting scope. The recorded clarification answers authorize this revised proposal but do not constitute that confirmation.

## Proposed scope

### Browse, filter, refresh, and paginate

- Request `GET /incidents` and present only the `OPEN` incident summaries returned by the API, newest first. Each row/card shows the incident ID, configured site label, API `type`, `severity`, `status`, and formatted `occurredAt`.
- Configure exactly `site-a` as “Site A” and `site-b` as “Site B.” Provide one site selector with all accessible sites or either configured site, and one severity selector with all severities or one of `LOW`, `MEDIUM`, and `HIGH`. “All” choices are represented by omitting the corresponding query parameter; display labels are never sent as parameter values.
- Site choices come from frontend configuration for those two accessible site IDs, not from the currently loaded rows and not from a new site-catalogue endpoint. Mockup facility names are sample content and are not available facilities or mappings.
- A site or severity change, Clear filters, or Refresh starts a fresh sequence: discard the prior cursor and replace the loaded list with a first-page response. Clear filters selects all sites and all severities. Refresh retains the current filter selections while starting that sequence again.
- Load more sends the preceding non-null `nextCursor` unchanged with the current filters and appends the returned page. It cannot overlap another load-more request. It is available only when a next cursor exists; `nextCursor: null` produces an explicit end-of-list state. Show the number of incidents actually loaded, not a total or remaining count.
- Preserve the API's fixed ordering. Do not add selectable sorting, numbered pages, totals, or filters for status, type, or date range.
- Ignore or discard a response that became stale because the filters or selected incident changed before it completed.

### Incident detail and history

- Opening a row/card fetches `GET /incidents/{id}` and opens a responsive detail sheet. The sheet displays the returned ID, configured site label, type, severity, status, occurrence time, description, and activity history.
- On desktop and mobile, format API timestamp instants in the viewer's local time zone with an unambiguous local date, time, and zone. An occurrence time may additionally include relative text. Activity history always uses absolute zoned date/time rather than relative-only text.
- Display history oldest first and show each returned entry's `action`, `actorId`, and `occurredAt`; do not fabricate activity descriptions, people, or timestamps. An empty `activityHistory` produces a deliberate empty-history message inside the sheet rather than an error.
- Detail loading and recoverable detail errors appear within the sheet. A retry refetches that incident. The user may close the sheet explicitly.

### Status changes

- Offer only these actions for the current returned status: `OPEN` to `ACKNOWLEDGED` or `RESOLVED`; `ACKNOWLEDGED` to `RESOLVED`; and none for terminal `RESOLVED`.
- A selected action sends one `PATCH /incidents/{id}` with the target status. Disable all mutation controls while it is saving and prevent further submissions until that request settles. There is no client idempotency key and the UI must not treat the API's same-status retry behavior as general idempotency.
- On success, remove the incident from the current `OPEN` list, keep its sheet open, replace the sheet's status and complete activity history with the returned detail object, and show an in-context success confirmation. Expose only an action still valid for the returned status: an acknowledged incident offers Resolve, while a resolved incident offers no status action.
- On a `409`, keep the sheet open, retain useful visible state, explain that the incident changed or the transition is no longer allowed, and offer Reload incident. Reload performs a new detail request; the operator must reconsider from the newly returned status before any further action.

### Contextual states and errors

- Provide distinct in-context states for initial list loading, load-more loading, detail loading, saving, empty list results, empty history, successful status change, end of list, and recoverable errors.
- List, detail, pagination, refresh, and mutation failures expose an appropriate retry or reload action without discarding still-useful content. Access-denied and not-found responses are presented as such rather than as login prompts.
- Error text may use `detail` from an `application/problem+json` body, otherwise `error`, with a friendly fallback. The UI must not assume all failures share one JSON shape or that every failure body is JSON.
- Prevent overlapping Load more and save operations from corrupting state. A failed save restores valid controls according to the still-known status; a successful or reloaded response determines subsequent controls.

## Boundaries and API-aligned discrepancy dispositions

- Facility presentation is limited to the two configured sites: `site-a` is “Site A” and `site-b` is “Site B.” The mockups' facility names are sample content, not backend data. Do not display them as additional facilities or invent a sites endpoint.
- Severity is limited to `LOW`, `MEDIUM`, and `HIGH`. The prototype's `CRITICAL`, grouped “High & Critical,” and any other severity are excluded.
- The API's numeric ID is used for requests. An `INC-` prefix, if retained visually from the mockups, is presentation only.
- Incident `type` and activity `action` come from the API's open string fields. The mockup's invented incident titles, activity actions, actor names, and descriptions are not seed data or fallback content.
- Status updates use the detail object returned by the API. The sheet remains open after Acknowledge or Resolve; prototype automatic dismissal is excluded.
- Timestamp instants use the viewer-local presentation defined above. A hard-coded `CST` suffix, relative-only history time, or ambiguous local time is not permitted.
- No authentication/login flow, search, site catalogue, status filter, type filter, date filter, selectable sort, total count, page number, automatic polling, or production authorization configuration is included.

Technology selection, scaffolding, backend/API changes, CORS changes, production authentication or authorization, mock-data expansion, and unrelated visual-system work are excluded. This contract does not require an exhaustive test suite, a coverage target, or a broad browser matrix; those are effort boundaries, not waivers of the evidence below.

## Named acceptance criteria

- **AC1 — Open incident browsing:** Desktop and mobile show API-backed `OPEN` incident summaries in fixed newest-first order with the required fields, using exactly Site A (`site-a`) and Site B (`site-b`) and only `LOW`, `MEDIUM`, and `HIGH` severity.
- **AC2 — Filters, refresh, and cursor lifecycle:** Site/severity selection, Clear filters, and Refresh replace the list from a cursor-free request; Load more alone appends using the unchanged returned cursor; the loaded count and end state reflect returned data.
- **AC3 — Detail and history:** Opening an incident fetches and displays server detail, presents history oldest first using returned values and absolute viewer-local zoned date/time, and handles an empty history in context.
- **AC4 — Valid status actions:** Controls expose only `OPEN → ACKNOWLEDGED`, `OPEN → RESOLVED`, and `ACKNOWLEDGED → RESOLVED`; `RESOLVED` is terminal.
- **AC5 — Successful transition behavior:** A successful update removes the row from the `OPEN` list, keeps the sheet open, replaces status and history with the returned detail, confirms success, and exposes only any action valid for the returned status.
- **AC6 — Safe asynchronous behavior:** Loading and saving are visible in context; overlapping or duplicate load/save submissions cannot corrupt state; stale list/detail responses are discarded.
- **AC7 — Empty and error recovery:** Empty results, empty history, end of pagination, access denial, not found, network/server errors, and heterogeneous error bodies receive the specified contextual handling while useful state is preserved.
- **AC8 — Conflict recovery:** A `409` does not silently retry or close the sheet; Reload incident fetches current detail and requires the operator to reconsider available actions.
- **AC9 — Selected presentation behavior:** Desktop and mobile map `site-a` to “Site A” and `site-b` to “Site B”; show each timestamp as an unambiguous viewer-local date, time, and zone; permit additional relative text only for occurrence times; and use absolute zoned date/time for history without reintroducing unsupported mockup data or automatic sheet dismissal.

## Required evidence and minimum scenario set

Implementation verification must retain evidence tied to the criteria below. Fixed capture timestamps and cursor text need not match the repository examples; the behaviors and response shapes must.

| Scenario | Method | Acceptance criteria | Required retained evidence |
| --- | --- | --- | --- |
| **S1 — Initial browse and responsive presentation.** Load the all-sites/all-severities list; verify required fields, API order, `LOW`/`MEDIUM`/`HIGH` values, loaded count, Site A/Site B mapping, and viewer-local zoned occurrence times on desktop and mobile. | Automated behavior check plus manual demonstration | AC1, AC9 | Automated result/log showing request parameters and rendered order/fields; desktop and mobile screenshots showing the same returned records, selected site labels, and unambiguous local date/time/zone. |
| **S2 — Fresh sequences for controls.** Change each selector, clear filters, and refresh with active filters; verify each operation omits the old cursor, replaces rather than appends, retains only the selections required by the operation, and ignores a deliberately late prior response. | Automated check | AC2, AC6 | Test output with the ordered requests and assertions for parameters, replacement, selection state, and stale-response rejection. |
| **S3 — Cursor pagination and completion.** Using a multi-page response sequence, load two subsequent pages, verify append order and unchanged cursor/filter use, block a concurrent click, then handle `nextCursor: null`. | Automated check | AC2, AC6, AC7 | Test output showing request sequence, row IDs after each append, single in-flight request, loaded count, disabled/absent Load more, and visible end state. |
| **S4 — Detail with populated and empty history.** Open one incident with returned history and one with `activityHistory: []`; verify detail fetch, oldest-first action/actor/time rendering with absolute viewer-local zoned date/time, and the empty-history message. | Automated check | AC3, AC7, AC9 | Test result identifying fixtures/responses and assertions for ordering, returned field values, timestamp presentation, and empty-history state. |
| **S5 — Allowed and terminal actions.** Exercise an `OPEN` detail, an `ACKNOWLEDGED` detail, and a `RESOLVED` detail and verify exactly the permitted controls for each. | Automated check | AC4 | Test output listing visible/enabled actions for all three statuses. |
| **S6 — Successful transitions.** Exercise `OPEN → ACKNOWLEDGED`, then `ACKNOWLEDGED → RESOLVED`, and separately `OPEN → RESOLVED`; verify one PATCH per action, disabled controls while saving, row removal, open sheet, returned status/history, success confirmation, and only remaining valid actions. | Automated check | AC4, AC5, AC6 | Test log with request counts/bodies and state assertions before, during, and after each response. |
| **S7 — Conflict and recoverable failures.** Return a `409`, reload current detail, and verify actions are recomputed; also exercise representative list/detail/save network or server failure and both documented error-body shapes while preserving useful state. | Automated check | AC6, AC7, AC8 | Test output showing no automatic retry, the reload request/response, recomputed controls, retry availability, preserved content, and safe fallback error text. |
| **S8 — Operator walkthrough.** On desktop and mobile, demonstrate Site A/Site B and `LOW`/`MEDIUM`/`HIGH` filtering, pagination/end state, populated and empty detail, viewer-local zoned occurrence/history times, one successful update with the sheet remaining open and returned detail displayed, terminal state, and conflict reload; visually confirm loading/saving/success/error states and the absence of extra mockup facilities, `CRITICAL`, “High & Critical,” hard-coded `CST`, and automatic dismissal. | Manual demonstration | AC1–AC9 | Dated walkthrough notes and a compact screenshot or recording set covering each named state, with the API response/fixture used for each segment identified. |

## Recorded human decisions incorporated

The recorded clarification answers select the following product choices for this revised proposal: Site A/Site B labels; viewer-local zoned timestamp presentation; exactly the two configured API sites; only `LOW`, `MEDIUM`, and `HIGH` severity; and keeping the detail sheet open after a successful status change while applying the returned detail and exposing only any remaining valid action. These selections settle the choices within this draft. They authorize revision of the proposal only and are distinct from repository facts and from final contract approval.

## Supporting repository evidence inspected

### API integration guide

- `incident-api/backend/docs/api/README.md` states that mockup field names, sample facilities, and prototype scripts are not the API contract. It defines the two fixed accessible site IDs, absence of a site catalogue and display names, the three severity values, OPEN-only fixed-order listing, cursor rules, filters-before-pagination, loaded-count limitation, fresh-sequence behavior, and current-data rather than snapshot semantics.
- The same guide defines detail fetching, oldest-first/possibly-empty history, allowed status transitions, same-status retry limits, atomic returned status/history, duplicate-control guidance, removal from the OPEN list while keeping the sheet available, `409` reload behavior, heterogeneous errors, and the required contextual states.
- These are repository facts. The exact display labels and timestamp presentation are product choices supplied by the recorded clarification answers rather than facts established by the guide.

### Captured API responses and specification

- `incident-api/backend/docs/api/openapi.yaml` confirms numeric IDs; `siteId`, open-string `type`, `LOW|MEDIUM|HIGH` severity, `OPEN|ACKNOWLEDGED|RESOLVED` status, ISO-8601 `occurredAt`, detail `description`, and history entries containing `action`, `actorId`, and `occurredAt`.
- `incident-search.json`, `incident-search-next.json`, and `incident-search-final.json` demonstrate cursor continuation and a final null cursor; `incident-search-empty.json` demonstrates a successful empty list.
- `incident-details.json` demonstrates returned oldest-first history and `incident-details-empty-history.json` demonstrates a valid empty array.
- `incident-updated.json`, `incident-update-retry.json`, and `incident-resolved.json` demonstrate server-returned status/history and unchanged same-status retry data. `conflict.json` demonstrates the 409 problem shape. The remaining captured errors demonstrate both `application/problem+json` (`detail`) and framework `application/json` (`error`) bodies.

### Desktop and mobile mockups

- The list and detail `screen.png` and `code.html` pairs under `incident-api/frontend/design/mockups/` provide appearance guidance for responsive cards/rows, filters, loaded count, Load more, and a modal/bottom-sheet detail treatment.
- The mockups also contain non-contract sample data: several invented facility names, formatted `INC-` identifiers, human-written incident/activity content, relative times with hard-coded `CST`, and—in one desktop detail prototype—`CRITICAL`/“High & Critical.” These observations do not establish backend data or new enums; the recorded choices keep facilities and severities aligned with the API.
- The desktop detail prototype scripts close the sheet after status actions. The API guide and proposed issue behavior support retaining it to show the returned status/history and possible next action, and the recorded human choice settles this proposal on that behavior. The script is therefore treated as a prototype discrepancy, not contract behavior.
