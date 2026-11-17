import {
  IncidentDetailRequest,
  initialIncidentDetailState,
  reduceIncidentDetail,
} from "./incident-detail.machine";
import { IncidentDetail } from "./incident.models";

const DETAIL: IncidentDetail = {
  id: 28,
  siteId: "site-a",
  type: "DOOR_FORCED_OPEN",
  severity: "LOW",
  status: "ACKNOWLEDGED",
  occurredAt: "2026-11-12T18:26:00Z",
  description: "Practice incident 28: DOOR_FORCED_OPEN at site-a.",
  activityHistory: [],
};

describe("incident detail reducer machine: token, generation, ID, active request, and open selection", () => {
  it("opens loading before accepting a matching complete detail", () => {
    let state = reduceIncidentDetail(initialIncidentDetailState(), {
      type: "selected",
      incidentId: 28,
      token: 1,
    });
    const request = state.activeRequest!;
    expect(state).toMatchObject({
      phase: "loading",
      generation: 1,
      selectedId: 28,
      activeRequest: { token: 1, generation: 1, incidentId: 28 },
    });

    state = reduceIncidentDetail(state, {
      type: "requestSucceeded",
      request,
      detail: DETAIL,
    });
    expect(state).toMatchObject({
      phase: "ready",
      selectedId: 28,
      activeRequest: null,
      detail: DETAIL,
    });
  });

  it.each([
    [403, "accessDenied"],
    [404, "notFound"],
    [0, "error"],
    [503, "error"],
  ] as const)(
    "classifies status %i as %s in the open sheet",
    (status, phase) => {
      let state = selected(28, 1);
      const request = state.activeRequest!;
      state = reduceIncidentDetail(state, {
        type: "requestFailed",
        request,
        status,
        message: `failure ${status}`,
      });
      expect(state).toMatchObject({
        phase,
        selectedId: 28,
        activeRequest: null,
        detail: null,
        errorMessage: `failure ${status}`,
      });
    },
  );

  it("rejects a success whose returned detail ID does not match the active incident", () => {
    const state = selected(28, 1);
    expect(
      reduceIncidentDetail(state, {
        type: "requestSucceeded",
        request: state.activeRequest!,
        detail: { ...DETAIL, id: 29 },
      }),
    ).toBe(state);
  });

  it.each(["success", "failure"] as const)(
    "rejects late %s for A after selecting B",
    (result) => {
      let state = selected(28, 1);
      const requestA = state.activeRequest!;
      state = reduceIncidentDetail(state, {
        type: "selected",
        incidentId: 29,
        token: 2,
      });
      const loadingB = state;
      state = release(state, requestA, result, DETAIL);
      expect(state).toBe(loadingB);
      expect(state).toMatchObject({
        phase: "loading",
        selectedId: 29,
        activeRequest: { token: 2, generation: 2, incidentId: 29 },
      });
    },
  );

  it.each(["success", "failure"] as const)(
    "rejects an older same-ID retry %s after a newer retry",
    (result) => {
      let state = selected(28, 1);
      state = reduceIncidentDetail(state, {
        type: "requestFailed",
        request: state.activeRequest!,
        status: 503,
        message: "first failure",
      });
      state = reduceIncidentDetail(state, { type: "retryRequested", token: 2 });
      const olderRetry = state.activeRequest!;
      state = reduceIncidentDetail(state, { type: "retryRequested", token: 3 });
      const newestRetry = state;

      state = release(state, olderRetry, result, DETAIL);
      expect(state).toBe(newestRetry);
      expect(state.activeRequest).toMatchObject({
        token: 3,
        generation: 1,
        incidentId: 28,
      });
    },
  );

  it.each(["success", "failure"] as const)(
    "rejects late %s after close invalidates and clears the lifecycle",
    (result) => {
      let state = selected(28, 1);
      const request = state.activeRequest!;
      state = reduceIncidentDetail(state, { type: "closed" });
      const closed = state;
      state = release(state, request, result, DETAIL);
      expect(state).toBe(closed);
      expect(state).toMatchObject({
        phase: "closed",
        generation: 2,
        selectedId: null,
        activeRequest: null,
        detail: null,
      });
    },
  );
});

function selected(id: number, token: number) {
  return reduceIncidentDetail(initialIncidentDetailState(), {
    type: "selected",
    incidentId: id,
    token,
  });
}

function release(
  state: ReturnType<typeof initialIncidentDetailState>,
  request: IncidentDetailRequest,
  result: "success" | "failure",
  detail: IncidentDetail,
) {
  return result === "success"
    ? reduceIncidentDetail(state, {
        type: "requestSucceeded",
        request,
        detail,
      })
    : reduceIncidentDetail(state, {
        type: "requestFailed",
        request,
        status: 503,
        message: "late failure",
      });
}
