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
    expect(root.querySelector('.state-panel button')).toBeNull();
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
    expect(root.querySelector('.state-panel button')?.textContent?.trim()).toBe('Retry');
  });

  it('retries the same first-page request and replaces the error with successful rows', () => {
    fixture.detectChanges();
    expectFirstPageRequest().flush({ detail: 'Try again' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const retry = fixture.nativeElement.querySelector('.state-panel button') as HTMLButtonElement;
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

/**
 * Scenario S2 (AC2, AC6): fresh first-page sequences for the filter controls, verified against
 * controlled responses only. Each test prints the ordered requests and visible results it observed.
 */
describe('IncidentList scenario S2: filters, Clear, Refresh, and stale responses', () => {
  const [HIGH_B, MEDIUM_A, LOW_B] = INCIDENTS;

  let fixture: ComponentFixture<IncidentList>;
  let http: HttpTestingController;
  let root: HTMLElement;
  let observations: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IncidentList);
    root = fixture.nativeElement as HTMLElement;
    observations = [];
    fixture.detectChanges();
  });

  afterEach((context) => {
    console.log(`[S2] ${context.task.name}\n${observations.map((line) => `  ${line}`).join('\n')}`);
    http.verify();
  });

  it('site-only filter requests siteId alone without a cursor and replaces the rows', () => {
    loadInitialPage();

    selectSite('site-a');
    expect(visible().state).toBe('loading');
    const request = expectRequest('select Site A', { siteId: 'site-a' });
    respond(request, [MEDIUM_A]);

    expect(visible()).toEqual({ state: 'ready', rowIds: [102], count: '1 incidents loaded', site: 'site-a', severity: 'all' });
  });

  it('severity-only filter requests severity alone without a cursor and replaces the rows', () => {
    loadInitialPage();

    selectSeverity('HIGH');
    const request = expectRequest('select HIGH', { severity: 'HIGH' });
    respond(request, [HIGH_B]);

    expect(visible()).toEqual({ state: 'ready', rowIds: [103], count: '1 incidents loaded', site: 'all', severity: 'HIGH' });
  });

  it('combined filters request both API values without a cursor and replace the rows', () => {
    loadInitialPage();

    selectSite('site-b');
    respond(expectRequest('select Site B', { siteId: 'site-b' }), [HIGH_B, LOW_B]);
    expect(visible().rowIds).toEqual([103, 101]);

    selectSeverity('LOW');
    respond(expectRequest('select LOW', { siteId: 'site-b', severity: 'LOW' }), [LOW_B]);

    expect(visible()).toEqual({ state: 'ready', rowIds: [101], count: '1 incidents loaded', site: 'site-b', severity: 'LOW' });
  });

  it('Clear resets both filters to All and requests an unfiltered, cursor-free first page', () => {
    loadInitialPage();
    selectSite('site-b');
    respond(expectRequest('select Site B', { siteId: 'site-b' }), [HIGH_B, LOW_B]);
    selectSeverity('LOW');
    respond(expectRequest('select LOW', { siteId: 'site-b', severity: 'LOW' }), [LOW_B]);

    click('Clear');
    expect(visible()).toMatchObject({ state: 'loading', site: 'all', severity: 'all' });
    respond(expectRequest('Clear', {}), INCIDENTS);

    expect(visible()).toEqual({
      state: 'ready',
      rowIds: [103, 102, 101],
      count: '3 incidents loaded',
      site: 'all',
      severity: 'all',
    });
  });

  it('Refresh keeps both selections, repeats their parameters without a cursor, and replaces the rows', () => {
    loadInitialPage();
    selectSite('site-b');
    respond(expectRequest('select Site B', { siteId: 'site-b' }), [HIGH_B, LOW_B]);
    selectSeverity('HIGH');
    respond(expectRequest('select HIGH', { siteId: 'site-b', severity: 'HIGH' }), [HIGH_B]);

    const newer: IncidentSummary = { ...HIGH_B, id: 104, type: 'Pressure spike' };
    click('Refresh');
    expect(visible()).toMatchObject({ state: 'loading', site: 'site-b', severity: 'HIGH' });
    respond(expectRequest('Refresh', { siteId: 'site-b', severity: 'HIGH' }), [newer, HIGH_B]);

    expect(visible()).toEqual({
      state: 'ready',
      rowIds: [104, 103],
      count: '2 incidents loaded',
      site: 'site-b',
      severity: 'HIGH',
    });
  });

  it('always offers every site and severity option, even when no displayed incident matches', () => {
    respond(expectRequest('initial load', {}), [LOW_B]);

    expect(optionLabels(0)).toEqual(['All sites', 'Site A', 'Site B']);
    expect(optionLabels(1)).toEqual(['All severities', 'LOW', 'MEDIUM', 'HIGH']);
    expect(visible()).toMatchObject({ site: 'all', severity: 'all' });
    observations.push(`options: site=${optionLabels(0).join('|')} severity=${optionLabels(1).join('|')}`);
  });

  it('ignores an older success that arrives after a newer success', () => {
    const older = expectRequest('initial load (held)', {});
    selectSite('site-a');
    const newer = expectRequest('select Site A', { siteId: 'site-a' });

    respond(newer, [MEDIUM_A], 'newer success released first');
    respond(older, INCIDENTS, 'older success released late');

    expect(visible()).toEqual({ state: 'ready', rowIds: [102], count: '1 incidents loaded', site: 'site-a', severity: 'all' });
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('ignores an older error that arrives after a newer success', () => {
    const older = expectRequest('initial load (held)', {});
    selectSeverity('MEDIUM');
    const newer = expectRequest('select MEDIUM', { severity: 'MEDIUM' });

    respond(newer, [MEDIUM_A], 'newer success released first');
    fail(older, 'older error released late');

    expect(visible()).toEqual({ state: 'ready', rowIds: [102], count: '1 incidents loaded', site: 'all', severity: 'MEDIUM' });
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(buttonLabels()).not.toContain('Retry');
  });

  it('keeps loading when an older response arrives while the latest request is still pending', () => {
    const olderSuccess = expectRequest('initial load (held)', {});
    selectSite('site-a');
    const olderError = expectRequest('select Site A (held)', { siteId: 'site-a' });
    click('Refresh');
    const latest = expectRequest('Refresh (held)', { siteId: 'site-a' });

    respond(olderSuccess, INCIDENTS, 'oldest success released while latest pending');
    expect(visible()).toMatchObject({ state: 'loading', rowIds: [], count: null });
    fail(olderError, 'older error released while latest pending');
    expect(visible()).toMatchObject({ state: 'loading', rowIds: [], count: null });

    respond(latest, [MEDIUM_A], 'latest success released');
    expect(visible()).toEqual({ state: 'ready', rowIds: [102], count: '1 incidents loaded', site: 'site-a', severity: 'all' });
  });

  it('shows the empty state when no incidents match and keeps the filters available', () => {
    loadInitialPage();
    selectSite('site-a');
    respond(expectRequest('select Site A', { siteId: 'site-a' }), [MEDIUM_A]);

    selectSeverity('HIGH');
    respond(expectRequest('select HIGH', { siteId: 'site-a', severity: 'HIGH' }), []);

    expect(visible()).toEqual({ state: 'empty', rowIds: [], count: null, site: 'site-a', severity: 'HIGH' });
    expect(root.textContent).toContain('No open incidents were found.');
    expect(root.textContent).toContain('No open incidents match the selected filters.');
    expect(buttonLabels()).toEqual(['Clear', 'Refresh']);
  });

  it('Retry after a failed latest request uses the current selections', () => {
    loadInitialPage();
    selectSite('site-a');
    respond(expectRequest('select Site A', { siteId: 'site-a' }), [MEDIUM_A]);
    selectSeverity('MEDIUM');
    fail(expectRequest('select MEDIUM', { siteId: 'site-a', severity: 'MEDIUM' }), 'latest request failed');

    expect(visible()).toMatchObject({ state: 'error', rowIds: [], count: null, site: 'site-a', severity: 'MEDIUM' });
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Service unavailable');

    click('Retry');
    respond(expectRequest('Retry', { siteId: 'site-a', severity: 'MEDIUM' }), [MEDIUM_A]);

    expect(visible()).toEqual({ state: 'ready', rowIds: [102], count: '1 incidents loaded', site: 'site-a', severity: 'MEDIUM' });
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  /** The initial page carries a non-null cursor so later requests can prove they never reuse it. */
  function loadInitialPage(): void {
    respond(expectRequest('initial load', {}), INCIDENTS);
    expect(visible()).toMatchObject({ state: 'ready', rowIds: [103, 102, 101], count: '3 incidents loaded' });
  }

  function expectRequest(action: string, expectedParams: Record<string, string>) {
    const pending = http.match(() => true).filter((candidate) => !handled.has(candidate));
    expect(pending).toHaveLength(1);
    const [request] = pending;
    handled.add(request);

    const { method, url, params, urlWithParams } = request.request;
    const actualParams = Object.fromEntries(params.keys().map((key) => [key, params.getAll(key)]));
    expect(method).toBe('GET');
    expect(url).toBe('/incidents');
    expect(params.has('cursor')).toBe(false);
    expect(actualParams).toEqual(Object.fromEntries(Object.entries(expectedParams).map(([key, value]) => [key, [value]])));

    labels.set(request, `${method} ${urlWithParams}`);
    observations.push(`request [${action}]: ${method} ${urlWithParams} (cursor sent: ${params.has('cursor')})`);
    return request;
  }

  function respond(request: ReturnType<typeof expectRequest>, incidents: IncidentSummary[], note = 'response'): void {
    request.flush({ incidents, nextCursor: 'cursor-from-earlier-sequence' } satisfies IncidentSearchResponse);
    fixture.detectChanges();
    observe(`${note} for ${labels.get(request)} with ids [${incidents.map((incident) => incident.id).join(', ')}]`);
  }

  function fail(request: ReturnType<typeof expectRequest>, note: string): void {
    request.flush({ detail: 'Service unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    fixture.detectChanges();
    observe(`${note} for ${labels.get(request)} with 503`);
  }

  const handled = new Set<unknown>();
  const labels = new Map<unknown, string>();

  function selects(): HTMLSelectElement[] {
    return Array.from(root.querySelectorAll('select'));
  }

  function optionLabels(index: number): string[] {
    return Array.from(selects()[index].options).map((option) => option.textContent?.trim() ?? '');
  }

  function choose(index: number, value: string): void {
    const select = selects()[index];
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function selectSite(value: string): void {
    choose(0, value);
  }

  function selectSeverity(value: string): void {
    choose(1, value);
  }

  function buttonLabels(): string[] {
    return Array.from(root.querySelectorAll('button')).map((button) => button.textContent?.trim() ?? '');
  }

  function click(label: string): void {
    const button = Array.from(root.querySelectorAll('button')).find((candidate) => candidate.textContent?.trim() === label);
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  function visible() {
    const rowIds = Array.from(root.querySelectorAll('.incident-id')).map((element) =>
      Number(element.textContent?.replace(/\D+/g, '')),
    );
    const state = root.querySelector('[role="alert"]')
      ? 'error'
      : root.querySelector('.incident-collection')
        ? 'ready'
        : root.textContent?.includes('Loading incidents…')
          ? 'loading'
          : 'empty';
    const [site, severity] = selects().map((select) => select.value);
    return { state, rowIds, count: root.querySelector('.loaded-count')?.textContent?.trim() ?? null, site, severity };
  }

  function observe(event: string): void {
    const { state, rowIds, count, site, severity } = visible();
    observations.push(
      `${event} -> visible: state=${state} rows=[${rowIds.join(', ')}] count=${count ?? 'none'} site=${site} severity=${severity}`,
    );
  }
});
