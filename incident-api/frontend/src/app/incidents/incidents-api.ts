import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { IncidentSearchResponse } from './incident.models';

@Injectable({ providedIn: 'root' })
export class IncidentsApi {
  private readonly http = inject(HttpClient);

  getFirstPage(): Observable<IncidentSearchResponse> {
    return this.http.get<IncidentSearchResponse>('/incidents');
  }
}
