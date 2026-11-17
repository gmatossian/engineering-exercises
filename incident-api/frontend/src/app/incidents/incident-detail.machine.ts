import { IncidentDetail } from "./incident.models";

export type IncidentDetailPhase =
  "closed" | "loading" | "ready" | "accessDenied" | "notFound" | "error";

export interface IncidentDetailRequest {
  readonly token: number;
  readonly generation: number;
  readonly incidentId: number;
}

export interface IncidentDetailState {
  readonly phase: IncidentDetailPhase;
  readonly generation: number;
  readonly selectedId: number | null;
  readonly activeRequest: IncidentDetailRequest | null;
  readonly detail: IncidentDetail | null;
  readonly errorMessage: string | null;
}

export type IncidentDetailEvent =
  | { type: "selected"; incidentId: number; token: number }
  | { type: "retryRequested"; token: number }
  | {
      type: "requestSucceeded";
      request: IncidentDetailRequest;
      detail: IncidentDetail;
    }
  | {
      type: "requestFailed";
      request: IncidentDetailRequest;
      status: number;
      message: string;
    }
  | { type: "closed" };

export function initialIncidentDetailState(): IncidentDetailState {
  return {
    phase: "closed",
    generation: 0,
    selectedId: null,
    activeRequest: null,
    detail: null,
    errorMessage: null,
  };
}

export function reduceIncidentDetail(
  state: IncidentDetailState,
  event: IncidentDetailEvent,
): IncidentDetailState {
  switch (event.type) {
    case "selected": {
      const generation = state.generation + 1;
      return loadingState(generation, event.incidentId, event.token);
    }
    case "retryRequested":
      if (state.phase === "closed" || state.selectedId === null) {
        return state;
      }
      return loadingState(state.generation, state.selectedId, event.token);
    case "requestSucceeded":
      if (
        !isCurrentRequest(state, event.request) ||
        event.detail.id !== event.request.incidentId
      ) {
        return state;
      }
      return {
        ...state,
        phase: "ready",
        activeRequest: null,
        detail: event.detail,
        errorMessage: null,
      };
    case "requestFailed":
      if (!isCurrentRequest(state, event.request)) {
        return state;
      }
      return {
        ...state,
        phase:
          event.status === 403
            ? "accessDenied"
            : event.status === 404
              ? "notFound"
              : "error",
        activeRequest: null,
        detail: null,
        errorMessage: event.message,
      };
    case "closed":
      return {
        phase: "closed",
        generation: state.generation + 1,
        selectedId: null,
        activeRequest: null,
        detail: null,
        errorMessage: null,
      };
  }
}

function loadingState(
  generation: number,
  incidentId: number,
  token: number,
): IncidentDetailState {
  return {
    phase: "loading",
    generation,
    selectedId: incidentId,
    activeRequest: { token, generation, incidentId },
    detail: null,
    errorMessage: null,
  };
}

function isCurrentRequest(
  state: IncidentDetailState,
  request: IncidentDetailRequest,
): boolean {
  const active = state.activeRequest;
  return (
    state.phase !== "closed" &&
    active !== null &&
    active === request &&
    active.token === request.token &&
    active.generation === request.generation &&
    active.incidentId === request.incidentId &&
    request.generation === state.generation &&
    request.incidentId === state.selectedId
  );
}
