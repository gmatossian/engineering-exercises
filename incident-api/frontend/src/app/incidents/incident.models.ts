export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type IncidentStatus = 'OPEN';

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
