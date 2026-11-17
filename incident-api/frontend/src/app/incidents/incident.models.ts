export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";

export type IncidentStatus = "OPEN";

export type IncidentDetailStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type IncidentSiteId = "site-a" | "site-b";

export type SiteFilter = "all" | IncidentSiteId;

export type SeverityFilter = "all" | IncidentSeverity;

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

export interface IncidentActivity {
  action: string;
  actorId: string;
  occurredAt: string;
}

export interface IncidentDetail {
  id: number;
  siteId: string;
  type: string;
  severity: IncidentSeverity;
  status: IncidentDetailStatus;
  occurredAt: string;
  description: string;
  activityHistory: IncidentActivity[];
}
