import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import {
  formatSiteLabel,
  formatZonedTime,
  normalizeIncidentListError,
} from "./incident-formatters";
import {
  IncidentListEvent,
  IncidentListRequest,
  ReplacementReason,
  initialIncidentListState,
  reduceIncidentList,
} from "./incident-list.machine";
import { IncidentFilters, SeverityFilter, SiteFilter } from "./incident.models";
import { IncidentsApi } from "./incidents-api";

const SITE_FILTERS: readonly SiteFilter[] = ["all", "site-a", "site-b"];
const SEVERITY_FILTERS: readonly SeverityFilter[] = [
  "all",
  "LOW",
  "MEDIUM",
  "HIGH",
];

@Component({
  selector: "app-incident-list",
  templateUrl: "./incident-list.html",
  styleUrl: "./incident-list.css",
})
export class IncidentList implements OnInit {
  private readonly api = inject(IncidentsApi);
  private readonly destroyRef = inject(DestroyRef);

  private nextToken = 0;

  readonly state = signal(initialIncidentListState());
  readonly filters = computed(() => this.state().filters);
  readonly hasActiveFilters = computed(
    () => this.filters().site !== "all" || this.filters().severity !== "all",
  );
  readonly loadedCount = computed(() => this.state().items.length);

  readonly siteOptions = SITE_FILTERS.map((value) => ({
    value,
    label: value === "all" ? "All sites" : formatSiteLabel(value),
  }));
  readonly severityOptions = SEVERITY_FILTERS.map((value) => ({
    value,
    label: value === "all" ? "All severities" : value,
  }));

  readonly formatSiteLabel = formatSiteLabel;
  readonly formatZonedTime = formatZonedTime;

  ngOnInit(): void {
    this.replace("initial", this.filters());
  }

  selectSite(value: string): void {
    const site = SITE_FILTERS.find((option) => option === value);
    if (site) {
      this.replace("site", { ...this.filters(), site });
    }
  }

  selectSeverity(value: string): void {
    const severity = SEVERITY_FILTERS.find((option) => option === value);
    if (severity) {
      this.replace("severity", { ...this.filters(), severity });
    }
  }

  clearFilters(): void {
    this.replace("clear", { site: "all", severity: "all" });
  }

  refresh(): void {
    this.replace("refresh", this.filters());
  }

  retry(): void {
    this.replace("retry", this.filters());
  }

  loadMore(): void {
    this.startAppend();
  }

  retryAppend(): void {
    this.startAppend();
  }

  private replace(reason: ReplacementReason, filters: IncidentFilters): void {
    const token = ++this.nextToken;
    this.dispatch({ type: "replacementRequested", token, reason, filters });
    const request = this.acceptedRequest("replace", token);
    if (request) {
      this.runRequest(request);
    }
  }

  private startAppend(): void {
    const token = ++this.nextToken;
    this.dispatch({ type: "appendRequested", token });
    const request = this.acceptedRequest("append", token);
    if (request) {
      this.runRequest(request);
    }
  }

  private acceptedRequest(
    kind: IncidentListRequest["kind"],
    token: number,
  ): IncidentListRequest | null {
    const request = this.state().activeRequest;
    return request?.kind === kind && request.token === token ? request : null;
  }

  private runRequest(request: IncidentListRequest): void {
    this.api
      .search(request.filters, request.startingCursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.dispatch({
            type:
              request.kind === "replace"
                ? "replacementSucceeded"
                : "appendSucceeded",
            request,
            response,
          });
        },
        error: (error: unknown) => {
          const body =
            error instanceof HttpErrorResponse ? error.error : undefined;
          const message = normalizeIncidentListError(body);
          this.dispatch(
            request.kind === "replace"
              ? { type: "replacementFailed", request, message }
              : { type: "appendFailed", request, message },
          );
        },
      });
  }

  private dispatch(event: IncidentListEvent): void {
    this.state.update((state) => reduceIncidentList(state, event));
  }
}
