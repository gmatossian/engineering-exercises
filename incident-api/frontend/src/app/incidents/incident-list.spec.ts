import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { formatZonedTime, INCIDENT_LIST_ERROR_FALLBACK } from './incident-formatters';
import { IncidentList } from './incident-list';
import { IncidentSearchResponse, IncidentSummary } from './incident.models';

const INCIDENTS: IncidentSummary[] = [
  {
    id: 103,
    siteId: 'site-b',
    type: 'Gas leak detected',
    severity: 'HIGH',
    status: 'OPEN',
    occurredAt: '2026-11-16T20:05:00Z',
  },
  {
    id: 102,
    siteId: 'site-a',
    type: 'Temperature variance',
    severity: 'MEDIUM',
    status: 'OPEN',
    occurredAt: '2026-11-16T19:45:00Z',
  },
  {
    id: 101,
    siteId: 'site-b',
    type: 'Sensor offline',
    severity: 'LOW',
    status: 'OPEN',
    occurredAt: '2026-11-16T19:15:00Z',
  },
];

describe('IncidentList', () => {
  let fixture: ComponentFixture<IncidentList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IncidentList);
  });

  afterEach(() => {
    http.verify();
  });

  it('shows loading while exactly one cursor-free, unfiltered first-page request is pending', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading incidents…');
    const request = expectFirstPageRequest();
    expect(request.request.method).toBe('GET');
  });

  it('renders all returned fields in API order with mappings, zones, original instants, and loaded count', () => {
    fixture.detectChanges();
    expectFirstPageRequest().flush(page(INCIDENTS));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const rows = Array.from(root.querySelectorAll<HTMLElement>('.incident-row'));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.querySelector('.incident-id')?.textContent?.trim())).toEqual([
      'ID 103',
      'ID 102',
      'ID 101',
    ]);
    expect(root.textContent).toContain('3 incidents loaded');
    expect(root.textContent).toContain('Site A');
    expect(root.textContent).toContain('Site B');
    expect(root.textContent).toContain('Gas leak detected');
    expect(root.textContent).toContain('Temperature variance');
    expect(root.textContent).toContain('Sensor offline');

    for (const severity of ['LOW', 'MEDIUM', 'HIGH']) {
      expect(root.textContent).toContain(severity);
    }
    expect(root.querySelectorAll('.status')[0]?.textContent).toContain('OPEN');

    const times = Array.from(root.querySelectorAll<HTMLTimeElement>('time'));
    expect(times.map((time) => time.dateTime)).toEqual(INCIDENTS.map((incident) => incident.occurredAt));
    expect(times.map((time) => time.textContent?.replace(/\s+/g, ' ').trim())).toEqual(
      INCIDENTS.map((incident) => `Occurred ${formatZonedTime(incident.occurredAt)}`),
    );
  });

  it('renders a distinct successful empty state without Retry', () => {
    fixture.detectChanges();
    expectFirstPageRequest().flush(page([]));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('No open incidents were found.');
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('.incident-collection')).toBeNull();
  });

  it.each([
    [{ detail: 'Service is warming up' }, 'Service is warming up'],
    [{ error: 'Temporary outage' }, 'Temporary outage'],
    ['unreadable response body', INCIDENT_LIST_ERROR_FALLBACK],
  ])('normalizes a failed response and exposes Retry', (body, expectedMessage) => {
    fixture.detectChanges();
    expectFirstPageRequest().flush(body, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[role="alert"]')?.textContent).toContain(expectedMessage);
    expect(root.querySelector('button')?.textContent?.trim()).toBe('Retry');
  });

  it('retries the same first-page request and replaces the error with successful rows', () => {
    fixture.detectChanges();
    expectFirstPageRequest().flush({ detail: 'Try again' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const retry = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    retry.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading incidents…');
    expectFirstPageRequest().flush(page([INCIDENTS[0]]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('1 incidents loaded');
    expect(fixture.nativeElement.textContent).toContain('Gas leak detected');
  });

  function expectFirstPageRequest() {
    const request = http.expectOne('/incidents');
    expect(request.request.url).toBe('/incidents');
    expect(request.request.urlWithParams).toBe('/incidents');
    expect(request.request.params.keys()).toEqual([]);
    return request;
  }
});

function page(incidents: IncidentSummary[]): IncidentSearchResponse {
  return { incidents, nextCursor: null };
}
