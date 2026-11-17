import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

import {
  IncidentDetail,
  IncidentFilters,
  IncidentSearchResponse,
} from "./incident.models";

@Injectable({ providedIn: "root" })
export class IncidentsApi {
  private readonly http = inject(HttpClient);

  /** Searches with an optional opaque cursor; "all" filters and only a null cursor are omitted. */
  search(
    filters: IncidentFilters,
    cursor: string | null,
  ): Observable<IncidentSearchResponse> {
    let params = new HttpParams();
    if (filters.site !== "all") {
      params = params.set("siteId", filters.site);
    }
    if (filters.severity !== "all") {
      params = params.set("severity", filters.severity);
    }
    if (cursor !== null) {
      params = params.set("cursor", cursor);
    }

    return this.http.get<IncidentSearchResponse>("/incidents", { params });
  }

  getById(id: number): Observable<IncidentDetail> {
    return this.http.get<IncidentDetail>(`/incidents/${id}`);
  }
}
