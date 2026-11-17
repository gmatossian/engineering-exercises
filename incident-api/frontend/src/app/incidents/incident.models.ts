export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type IncidentStatus = 'OPEN';

export type IncidentSiteId = 'site-a' | 'site-b';

export type SiteFilter = 'all' | IncidentSiteId;

export type SeverityFilter = 'all' | IncidentSeverity;

export interface IncidentFilters {
  site: SiteFilter;
  severity: SeverityFilter;
}

export interface IncidentSummary {
  id: number;
  siteId: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  occurredAt: string;
}

export interface IncidentSearchResponse {
  incidents: IncidentSummary[];
  nextCursor: string | null;
}

export type IncidentListState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: IncidentSummary[] }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };
