import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { formatSiteLabel, formatZonedTime, normalizeIncidentListError } from './incident-formatters';
import { IncidentListState } from './incident.models';
import { IncidentsApi } from './incidents-api';

@Component({
  selector: 'app-incident-list',
  templateUrl: './incident-list.html',
  styleUrl: './incident-list.css',
})
export class IncidentList implements OnInit {
  private readonly api = inject(IncidentsApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<IncidentListState>({ kind: 'loading' });
  readonly formatSiteLabel = formatSiteLabel;
  readonly formatZonedTime = formatZonedTime;

  ngOnInit(): void {
    this.loadFirstPage();
  }

  retry(): void {
    this.loadFirstPage();
  }

  private loadFirstPage(): void {
    this.state.set({ kind: 'loading' });

    this.api
      .getFirstPage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ incidents }) => {
          this.state.set(incidents.length > 0 ? { kind: 'ready', items: incidents } : { kind: 'empty' });
        },
        error: (error: unknown) => {
          const body = error instanceof HttpErrorResponse ? error.error : undefined;
          this.state.set({ kind: 'error', message: normalizeIncidentListError(body) });
        },
      });
  }
}
