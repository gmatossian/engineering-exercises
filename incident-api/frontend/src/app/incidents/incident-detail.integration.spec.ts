import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { ComponentFixture, TestBed } from "@angular/core/testing";

import { INCIDENT_DETAIL_ERROR_FALLBACK } from "./incident-formatters";
import { IncidentList } from "./incident-list";
import {
  IncidentDetail,
  IncidentSearchResponse,
  IncidentSummary,
} from "./incident.models";

const SUMMARIES: IncidentSummary[] = [
  {
    id: 28,
    siteId: "site-a",
    type: "DOOR_FORCED_OPEN",
    severity: "LOW",
    status: "OPEN",
    occurredAt: "2026-11-12T18:26:00Z",
  },
  {
    id: 29,
    siteId: "site-b",
    type: "SENSOR_OFFLINE",
    severity: "HIGH",
    status: "OPEN",
    occurredAt: "2026-11-12T18:30:00Z",
  },
];

const DETAIL: IncidentDetail = {
  id: 28,
  siteId: "site-a",
  type: "DOOR_FORCED_OPEN",
  severity: "LOW",
  status: "ACKNOWLEDGED",
  occurredAt: "2026-11-12T18:26:00Z",
  description: "Practice incident 28: DOOR_FORCED_OPEN at site-a.",
  activityHistory: [
    {
      action: "CREATED",
      actorId: "operator-a",
      occurredAt: "2026-11-12T18:26:00Z",
    },
    {
      action: "ACKNOWLEDGED",
      actorId: "operator-b",
      occurredAt: "2026-11-12T18:26:10Z",
    },
  ],
};

describe("IncidentList detail coordinator scenarios", () => {
  let fixture: ComponentFixture<IncidentList>;
  let http: HttpTestingController;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IncidentList);
    root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne("/incidents").flush(page(SUMMARIES));
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it("D-S4-POPULATED selects numeric 28, requests /incidents/28, and renders the complete response", () => {
    select(0);
    expect(root.textContent).toContain("Loading incident 28");
    const request = http.expectOne("/incidents/28");
    expect(request.request.method).toBe("GET");
    expect(request.request.urlWithParams).toBe("/incidents/28");
    request.flush(DETAIL);
    fixture.detectChanges();

    expect(root.textContent).toContain(DETAIL.description);
    expect(root.textContent).toContain("Actor ID: operator-a");
    expect(root.textContent).toContain("Actor ID: operator-b");
    expect(fixture.componentInstance.detailState()).toMatchObject({
      phase: "ready",
      selectedId: 28,
      detail: DETAIL,
      activeRequest: null,
    });
  });

  it.each([
    [403, "Access denied"],
    [404, "Incident not found"],
  ] as const)(
    "D-S7 keeps HTTP %i contextual and distinct",
    (status, heading) => {
      select(0);
      http
        .expectOne("/incidents/28")
        .flush(
          { detail: `response ${status}` },
          { status, statusText: "Failure" },
        );
      fixture.detectChanges();
      expect(root.textContent).toContain(heading);
      expect(root.textContent).toContain(`response ${status}`);
      expect(root.textContent).not.toContain("Retry");
    },
  );

  it.each([
    [{ detail: "Service warming up" }, "Service warming up"],
    [{ error: "Temporary outage" }, "Temporary outage"],
    ["non-json body", INCIDENT_DETAIL_ERROR_FALLBACK],
  ])(
    "D-S7 normalizes recoverable body %j and retries the same ID with a fresh token",
    (body, message) => {
      select(0);
      const initialToken =
        fixture.componentInstance.detailState().activeRequest!.token;
      http.expectOne("/incidents/28").flush(body, {
        status: 503,
        statusText: "Service Unavailable",
      });
      fixture.detectChanges();
      expect(root.textContent).toContain(message);

      clickText("Retry");
      const retryToken =
        fixture.componentInstance.detailState().activeRequest!.token;
      expect(retryToken).not.toBe(initialToken);
      expect(fixture.componentInstance.detailState()).toMatchObject({
        phase: "loading",
        selectedId: 28,
      });
      http.expectOne("/incidents/28").flush(DETAIL);
      fixture.detectChanges();
      expect(fixture.componentInstance.detailState().phase).toBe("ready");
      expect(root.textContent).toContain(DETAIL.description);
    },
  );

  it("D-RACE-LATE ignores A success after B selection and shows only B", () => {
    select(0);
    const requestA = http.expectOne("/incidents/28");
    select(1);
    const requestB = http.expectOne("/incidents/29");
    expect(fixture.componentInstance.detailState()).toMatchObject({
      phase: "loading",
      selectedId: 29,
      generation: 2,
    });

    requestA.flush(DETAIL);
    fixture.detectChanges();
    expect(fixture.componentInstance.detailState()).toMatchObject({
      phase: "loading",
      selectedId: 29,
    });
    const detailB = {
      ...DETAIL,
      id: 29,
      siteId: "site-b",
      type: "SENSOR_OFFLINE",
      severity: "HIGH" as const,
      description: "Practice incident 29: SENSOR_OFFLINE at site-b.",
    };
    requestB.flush(detailB);
    fixture.detectChanges();
    expect(fixture.componentInstance.detailState()).toMatchObject({
      phase: "ready",
      selectedId: 29,
      detail: detailB,
    });
    expect(root.textContent).not.toContain(DETAIL.description);
  });

  it("D-RACE-LATE rejects late failure after close and does not remount the sheet", () => {
    select(0);
    const request = http.expectOne("/incidents/28");
    clickLabel("Close incident details");
    fixture.detectChanges();
    request.flush(
      { detail: "late failure" },
      { status: 503, statusText: "Failure" },
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.detailState()).toMatchObject({
      phase: "closed",
      selectedId: null,
      activeRequest: null,
    });
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it("D-A11Y-FOCUS restores the connected origin after explicit close and Escape", async () => {
    const origin = selectionButtons()[0];
    origin.click();
    fixture.detectChanges();
    const request = http.expectOne("/incidents/28");
    expect(document.activeElement).toBe(
      root.querySelector('[aria-label="Close incident details"]'),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(origin);
    request.flush(DETAIL);
  });

  it("D-A11Y-FOCUS uses the stable heading fallback when replacement removes the origin", async () => {
    select(0);
    const detailRequest = http.expectOne("/incidents/28");
    fixture.componentInstance.refresh();
    fixture.detectChanges();
    const listRequest = http.expectOne("/incidents");
    expect(selectionButtons()).toHaveLength(0);

    clickLabel("Close incident details");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(
      root.querySelector("#incident-list-heading"),
    );
    detailRequest.flush(DETAIL);
    listRequest.flush(page(SUMMARIES));
  });

  function select(index: number): void {
    selectionButtons()[index].click();
    fixture.detectChanges();
  }

  function selectionButtons(): HTMLButtonElement[] {
    return Array.from(
      root.querySelectorAll<HTMLButtonElement>(".incident-select"),
    );
  }

  function clickText(text: string): void {
    const button = Array.from(root.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    expect(button).toBeDefined();
    button!.click();
    fixture.detectChanges();
  }

  function clickLabel(label: string): void {
    const button = root.querySelector(
      `[aria-label="${label}"]`,
    ) as HTMLButtonElement;
    button.click();
  }
});

function page(incidents: IncidentSummary[]): IncidentSearchResponse {
  return { incidents, nextCursor: null };
}
