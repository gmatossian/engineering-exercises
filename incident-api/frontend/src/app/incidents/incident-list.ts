import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { formatSiteLabel, formatZonedTime, normalizeIncidentListError } from './incident-formatters';
import { IncidentFilters, IncidentListState, SeverityFilter, SiteFilter } from './incident.models';
import { IncidentsApi } from './incidents-api';

const SITE_FILTERS: readonly SiteFilter[] = ['all', 'site-a', 'site-b'];
const SEVERITY_FILTERS: readonly SeverityFilter[] = ['all', 'LOW', 'MEDIUM', 'HIGH'];

@Component({
  selector: 'app-incident-list',
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.css',
})
export class IncidentList implements OnInit {
  private readonly api = inject(IncidentsApi);
  private readonly destroyRef = inject(DestroyRef);

  /** Identifies the latest first-page request; responses from any earlier one are discarded. */
  private generation = 0;

  readonly state = signal<IncidentListState>({ kind: 'loading' });
  readonly filters = signal<IncidentFilters>({ site: 'all', severity: 'all' });
  readonly hasActiveFilters = computed(() => this.filters().site !== 'all' || this.filters().severity !== 'all');

  readonly siteOptions = SITE_FILTERS.map((value) => ({
    value,
    label: value === 'all' ? 'All sites' : formatSiteLabel(value),
  }));
  readonly severityOptions = SEVERITY_FILTERS.map((value) => ({
    value,
    label: value === 'all' ? 'All severities' : value,
  }));

  readonly formatSiteLabel = formatSiteLabel;
  readonly formatZonedTime = formatZonedTime;

  ngOnInit(): void {
    this.loadFirstPage();
  }

  selectSite(value: string): void {
    const site = SITE_FILTERS.find((option) => option === value);
    if (site) {
      this.filters.update((filters) => ({ ...filters, site }));
      this.loadFirstPage();
    }
  }

  selectSeverity(value: string): void {
    const severity = SEVERITY_FILTERS.find((option) => option === value);
    if (severity) {
      this.filters.update((filters) => ({ ...filters, severity }));
      this.loadFirstPage();
    }
  }

  clearFilters(): void {
    this.filters.set({ site: 'all', severity: 'all' });
    this.loadFirstPage();
  }

  refresh(): void {
    this.loadFirstPage();
  }

  retry(): void {
    this.loadFirstPage();
  }

  private loadFirstPage(): void {
    const generation = ++this.generation;
    this.state.set({ kind: 'loading' });

    this.api
      .getFirstPage(this.filters())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ incidents }) => {
          if (generation !== this.generation) {
            return;
          }
          this.state.set(incidents.length > 0 ? { kind: 'ready', items: incidents } : { kind: 'empty' });
        },
        error: (error: unknown) => {
          if (generation !== this.generation) {
            return;
          }
          const body = error instanceof HttpErrorResponse ? error.error : undefined;
          this.state.set({ kind: 'error', message: normalizeIncidentListError(body) });
        },
      });
  }
}
