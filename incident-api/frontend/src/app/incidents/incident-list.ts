import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

import {
  formatSiteLabel,
  formatZonedTime,
  normalizeIncidentDetailError,
  normalizeIncidentListError,
} from "./incident-formatters";
import { IncidentDetailSheet } from "./incident-detail-sheet";
import {
  IncidentDetailEvent,
  IncidentDetailRequest,
  initialIncidentDetailState,
  reduceIncidentDetail,
} from "./incident-detail.machine";
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
  imports: [IncidentDetailSheet],
  templateUrl: "./incident-list.html",
  styleUrl: "./incident-list.css",
})
export class IncidentList implements OnInit {
  private readonly api = inject(IncidentsApi);
  private readonly destroyRef = inject(DestroyRef);

  private nextToken = 0;
  private nextDetailToken = 0;
  private detailOrigin: HTMLElement | null = null;

  private readonly listHeading =
    viewChild.required<ElementRef<HTMLElement>>("listHeading");

  readonly state = signal(initialIncidentListState());
  readonly detailState = signal(initialIncidentDetailState());
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

  selectIncident(incidentId: number, origin: EventTarget | null): void {
    this.detailOrigin = origin instanceof HTMLElement ? origin : null;
    const token = ++this.nextDetailToken;
    this.dispatchDetail({ type: "selected", incidentId, token });
    const request = this.acceptedDetailRequest(token);
    if (request) {
      this.runDetailRequest(request);
    }
  }

  retryDetail(): void {
    const token = ++this.nextDetailToken;
    this.dispatchDetail({ type: "retryRequested", token });
    const request = this.acceptedDetailRequest(token);
    if (request) {
      this.runDetailRequest(request);
    }
  }

  closeDetail(): void {
    const origin = this.detailOrigin;
    this.detailOrigin = null;
    this.dispatchDetail({ type: "closed" });
    queueMicrotask(() => this.restoreDetailFocus(origin));
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

  private acceptedDetailRequest(token: number): IncidentDetailRequest | null {
    const request = this.detailState().activeRequest;
    return request?.token === token ? request : null;
  }

  private runDetailRequest(request: IncidentDetailRequest): void {
    this.api
      .getById(request.incidentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) =>
          this.dispatchDetail({ type: "requestSucceeded", request, detail }),
        error: (error: unknown) => {
          const status = error instanceof HttpErrorResponse ? error.status : 0;
          const body =
            error instanceof HttpErrorResponse ? error.error : undefined;
          this.dispatchDetail({
            type: "requestFailed",
            request,
            status,
            message: normalizeIncidentDetailError(body),
          });
        },
      });
  }

  private restoreDetailFocus(origin: HTMLElement | null): void {
    if (origin?.isConnected) {
      origin.focus();
      return;
    }
    const firstCurrentControl = document.querySelector<HTMLElement>(
      ".incident-list .incident-select",
    );
    (firstCurrentControl ?? this.listHeading().nativeElement).focus();
  }

  private dispatch(event: IncidentListEvent): void {
    this.state.update((state) => reduceIncidentList(state, event));
  }

  private dispatchDetail(event: IncidentDetailEvent): void {
    this.detailState.update((state) => reduceIncidentDetail(state, event));
  }
}
