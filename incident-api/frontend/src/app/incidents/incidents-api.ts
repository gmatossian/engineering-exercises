import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { IncidentFilters, IncidentSearchResponse } from './incident.models';

@Injectable({ providedIn: 'root' })
export class IncidentsApi {
  private readonly http = inject(HttpClient);

  /** Fetches a cursor-free first page; an "all" filter is sent by omitting its parameter. */
  getFirstPage(filters: IncidentFilters = { site: 'all', severity: 'all' }): Observable<IncidentSearchResponse> {
    let params = new HttpParams();
    if (filters.site !== 'all') {
      params = params.set('siteId', filters.site);
    }
    if (filters.severity !== 'all') {
      params = params.set('severity', filters.severity);
    }

    return this.http.get<IncidentSearchResponse>('/incidents', { params });
  }
}
