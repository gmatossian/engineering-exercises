import {
  IncidentListRequest,
  initialIncidentListState,
  reduceIncidentList,
} from "./incident-list.machine";
import { IncidentSearchResponse, IncidentSummary } from "./incident.models";

const ITEM: IncidentSummary = {
  id: 1,
  siteId: "site-a",
  type: "Test incident",
  severity: "HIGH",
  status: "OPEN",
  occurredAt: "2026-11-16T20:05:00Z",
};

describe("incident list reducer machine", () => {
  it("synchronously excludes overlap, preserves failure state, appends in order, and enforces completion", () => {
    let state = reduceIncidentList(initialIncidentListState(), {
      type: "replacementRequested",
      token: 1,
      reason: "initial",
      filters: { site: "site-a", severity: "HIGH" },
    });
    const replacement = state.activeRequest!;
    state = reduceIncidentList(state, {
      type: "replacementSucceeded",
      request: replacement,
      response: response([ITEM], "opaque-1"),
    });

    state = reduceIncidentList(state, { type: "appendRequested", token: 2 });
    const append = state.activeRequest!;
    expect(append).toMatchObject({
      kind: "append",
      token: 2,
      startingCursor: "opaque-1",
    });
    expect(
      reduceIncidentList(state, { type: "appendRequested", token: 3 }),
    ).toBe(state);

    state = reduceIncidentList(state, {
      type: "appendFailed",
      request: append,
      message: "Unavailable",
    });
    expect(state).toMatchObject({
      phase: "appendError",
      nextCursor: "opaque-1",
      items: [ITEM],
    });

    state = reduceIncidentList(state, { type: "appendRequested", token: 4 });
    const retry = state.activeRequest!;
    expect(retry.startingCursor).toBe("opaque-1");
    const next = { ...ITEM, id: 2 };
    state = reduceIncidentList(state, {
      type: "appendSucceeded",
      request: retry,
      response: response([next], null),
    });
    expect(state.items.map(({ id }) => id)).toEqual([1, 2]);
    expect(state).toMatchObject({
      phase: "complete",
      nextCursor: null,
      activeRequest: null,
    });
    expect(
      reduceIncidentList(state, { type: "appendRequested", token: 5 }),
    ).toBe(state);
  });

  it.each(["appendSucceeded", "appendFailed"] as const)(
    "rejects a stale %s after replacement invalidates the append",
    (type) => {
      let state = readyState();
      state = reduceIncidentList(state, { type: "appendRequested", token: 2 });
      const staleAppend = state.activeRequest!;
      state = reduceIncidentList(state, {
        type: "replacementRequested",
        token: 3,
        reason: "refresh",
        filters: state.filters,
      });
      const replacementState = state;

      state =
        type === "appendSucceeded"
          ? reduceIncidentList(state, {
              type,
              request: staleAppend,
              response: response([{ ...ITEM, id: 2 }], null),
            })
          : reduceIncidentList(state, {
              type,
              request: staleAppend,
              message: "late failure",
            });

      expect(state).toBe(replacementState);
    },
  );
});

function readyState() {
  let state = reduceIncidentList(initialIncidentListState(), {
    type: "replacementRequested",
    token: 1,
    reason: "initial",
    filters: { site: "all", severity: "all" },
  });
  const request = state.activeRequest as IncidentListRequest;
  return reduceIncidentList(state, {
    type: "replacementSucceeded",
    request,
    response: response([ITEM], "opaque-1"),
  });
}

function response(
  incidents: IncidentSummary[],
  nextCursor: string | null,
): IncidentSearchResponse {
  return { incidents, nextCursor };
}
