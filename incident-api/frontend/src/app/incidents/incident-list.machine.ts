import {
  IncidentFilters,
  IncidentSearchResponse,
  IncidentSummary,
} from "./incident.models";

export type IncidentListPhase =
  | "replacing"
  | "ready"
  | "appending"
  | "appendError"
  | "complete"
  | "empty"
  | "replacementError";

export interface IncidentListRequest {
  readonly kind: "replace" | "append";
  readonly token: number;
  readonly generation: number;
  readonly filters: Readonly<IncidentFilters>;
  readonly startingCursor: string | null;
}

export interface IncidentListMachineState {
  readonly filters: IncidentFilters;
  readonly generation: number;
  readonly phase: IncidentListPhase;
  readonly items: readonly IncidentSummary[];
  readonly nextCursor: string | null;
  readonly activeRequest: IncidentListRequest | null;
  readonly errorMessage: string | null;
}

export type ReplacementReason =
  "initial" | "site" | "severity" | "clear" | "refresh" | "retry";

export type IncidentListEvent =
  | {
      type: "replacementRequested";
      token: number;
      reason: ReplacementReason;
      filters: IncidentFilters;
    }
  | {
      type: "replacementSucceeded";
      request: IncidentListRequest;
      response: IncidentSearchResponse;
    }
  | { type: "replacementFailed"; request: IncidentListRequest; message: string }
  | { type: "appendRequested"; token: number }
  | {
      type: "appendSucceeded";
      request: IncidentListRequest;
      response: IncidentSearchResponse;
    }
  | { type: "appendFailed"; request: IncidentListRequest; message: string };

export function initialIncidentListState(): IncidentListMachineState {
  return {
    filters: { site: "all", severity: "all" },
    generation: 0,
    phase: "replacing",
    items: [],
    nextCursor: null,
    activeRequest: null,
    errorMessage: null,
  };
}

export function reduceIncidentList(
  state: IncidentListMachineState,
  event: IncidentListEvent,
): IncidentListMachineState {
  switch (event.type) {
    case "replacementRequested": {
      const generation = state.generation + 1;
      const filters = copyFilters(event.filters);
      return {
        filters,
        generation,
        phase: "replacing",
        items: [],
        nextCursor: null,
        activeRequest: {
          kind: "replace",
          token: event.token,
          generation,
          filters,
          startingCursor: null,
        },
        errorMessage: null,
      };
    }
    case "replacementSucceeded": {
      if (!isCurrentRequest(state, event.request, "replace", null)) {
        return state;
      }
      const items = [...event.response.incidents];
      return {
        ...state,
        phase:
          event.response.nextCursor !== null
            ? "ready"
            : items.length === 0
              ? "empty"
              : "complete",
        items,
        nextCursor: event.response.nextCursor,
        activeRequest: null,
        errorMessage: null,
      };
    }
    case "replacementFailed":
      if (!isCurrentRequest(state, event.request, "replace", null)) {
        return state;
      }
      return {
        ...state,
        phase: "replacementError",
        items: [],
        nextCursor: null,
        activeRequest: null,
        errorMessage: event.message,
      };
    case "appendRequested": {
      if (
        (state.phase !== "ready" && state.phase !== "appendError") ||
        state.activeRequest !== null ||
        state.nextCursor === null
      ) {
        return state;
      }
      const filters = copyFilters(state.filters);
      return {
        ...state,
        phase: "appending",
        activeRequest: {
          kind: "append",
          token: event.token,
          generation: state.generation,
          filters,
          startingCursor: state.nextCursor,
        },
        errorMessage: null,
      };
    }
    case "appendSucceeded":
      if (
        !isCurrentRequest(
          state,
          event.request,
          "append",
          event.request.startingCursor,
        )
      ) {
        return state;
      }
      return {
        ...state,
        phase: event.response.nextCursor === null ? "complete" : "ready",
        items: [...state.items, ...event.response.incidents],
        nextCursor: event.response.nextCursor,
        activeRequest: null,
        errorMessage: null,
      };
    case "appendFailed":
      if (
        !isCurrentRequest(
          state,
          event.request,
          "append",
          event.request.startingCursor,
        )
      ) {
        return state;
      }
      return {
        ...state,
        phase: "appendError",
        activeRequest: null,
        errorMessage: event.message,
      };
  }
}

function isCurrentRequest(
  state: IncidentListMachineState,
  request: IncidentListRequest,
  kind: IncidentListRequest["kind"],
  startingCursor: string | null,
): boolean {
  const active = state.activeRequest;
  return (
    active !== null &&
    active.kind === kind &&
    request.kind === kind &&
    active.token === request.token &&
    active.generation === request.generation &&
    active.startingCursor === startingCursor &&
    request.startingCursor === startingCursor &&
    sameFilters(active.filters, request.filters) &&
    request.generation === state.generation &&
    sameFilters(request.filters, state.filters) &&
    (kind === "replace" || state.nextCursor === startingCursor)
  );
}

function copyFilters(filters: IncidentFilters): IncidentFilters {
  return { site: filters.site, severity: filters.severity };
}

function sameFilters(
  left: Readonly<IncidentFilters>,
  right: Readonly<IncidentFilters>,
): boolean {
  return left.site === right.site && left.severity === right.severity;
}
