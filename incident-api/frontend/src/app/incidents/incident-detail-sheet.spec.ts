import { ComponentFixture, TestBed } from "@angular/core/testing";

import { IncidentDetailSheet } from "./incident-detail-sheet";
import { IncidentDetailState } from "./incident-detail.machine";
import { IncidentDetail } from "./incident.models";

const POPULATED: IncidentDetail = {
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

describe("IncidentDetailSheet scenarios D-S4 and D-A11Y-FOCUS", () => {
  let fixture: ComponentFixture<IncidentDetailSheet>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentDetailSheet],
    }).compileComponents();
  });

  it.each(["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const)(
    "D-S4-POPULATED renders every field and oldest-first returned history for %s",
    (status) => {
      create(ready({ ...POPULATED, status }));
      const text = root.textContent?.replace(/\s+/g, " ") ?? "";
      for (const value of [
        "28",
        "Site A",
        "DOOR_FORCED_OPEN",
        "LOW",
        status,
        POPULATED.description,
        "CREATED",
        "operator-a",
        "ACKNOWLEDGED",
        "operator-b",
      ]) {
        expect(text).toContain(value);
      }
      const activities = Array.from(root.querySelectorAll(".activity-item"));
      expect(
        activities.map((item) =>
          item.querySelector("strong")?.textContent?.trim(),
        ),
      ).toEqual(["CREATED", "ACKNOWLEDGED"]);
      expect(
        Array.from(root.querySelectorAll<HTMLTimeElement>("time")).map(
          (time) => time.dateTime,
        ),
      ).toEqual([
        POPULATED.occurredAt,
        ...POPULATED.activityHistory.map((activity) => activity.occurredAt),
      ]);
      const localZone = new Intl.DateTimeFormat(undefined, {
        timeZoneName: "short",
      });
      for (const time of root.querySelectorAll<HTMLTimeElement>("time")) {
        const zone = localZone
          .formatToParts(new Date(time.dateTime))
          .find((part) => part.type === "timeZoneName")!.value;
        expect(time.textContent).toContain(zone);
      }
    },
  );

  it("D-S4-EMPTY retains complete detail and deliberately reports empty history", () => {
    create(ready({ ...POPULATED, activityHistory: [] }));
    expect(root.textContent).toContain(POPULATED.description);
    expect(root.textContent).toContain("No activity has been recorded");
    expect(root.querySelectorAll(".activity-item")).toHaveLength(0);
  });

  it.each([
    ["loading", "Loading incident 28", false],
    ["accessDenied", "Access denied", false],
    ["notFound", "Incident not found", false],
    ["error", "Unable to load incident", true],
  ] as const)("renders contextual %s state", (phase, message, hasRetry) => {
    create(state(phase));
    expect(root.textContent).toContain(message);
    expect(root.textContent?.includes("Retry")).toBe(hasRetry);
  });

  it("provides a named modal, enters focus, contains both Tab boundaries, retries, and closes", () => {
    create(state("error"));
    const dialog = root.querySelector('[role="dialog"]') as HTMLElement;
    const close = root.querySelector(
      '[aria-label="Close incident details"]',
    ) as HTMLButtonElement;
    const retry = Array.from(root.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Retry",
    ) as HTMLButtonElement;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe(
      "incident-detail-heading",
    );
    expect(document.activeElement).toBe(close);

    retry.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    expect(document.activeElement).toBe(close);
    close.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement).toBe(retry);

    const retrySpy = vi.fn();
    const closeSpy = vi.fn();
    fixture.componentInstance.retry.subscribe(retrySpy);
    fixture.componentInstance.close.subscribe(closeSpy);
    retry.click();
    close.click();

    fixture.componentRef.setInput("state", ready(POPULATED));
    fixture.detectChanges();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    expect(document.activeElement).toBe(close);
    outside.remove();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(retrySpy).toHaveBeenCalledOnce();
    expect(closeSpy).toHaveBeenCalledTimes(2);
  });

  it("lets keyboard users enter the scrollable content and keeps it in the focus cycle", () => {
    create(ready(POPULATED));
    const close = root.querySelector<HTMLButtonElement>(
      '[aria-label="Close incident details"]',
    )!;
    const content = root.querySelector<HTMLElement>(".detail-body")!;
    expect(content.tabIndex).toBe(0);
    expect(content.getAttribute("aria-label")).toBe("Incident detail content");

    close.focus();
    const tab = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(tab);
    // jsdom does not implement native Tab traversal. It must remain unblocked.
    expect(tab.defaultPrevented).toBe(false);
    content.focus();
    expect(document.activeElement).toBe(content);

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(close);
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(content);
  });

  function create(detailState: IncidentDetailState): void {
    fixture = TestBed.createComponent(IncidentDetailSheet);
    fixture.componentRef.setInput("state", detailState);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  }
});

function ready(detail: IncidentDetail): IncidentDetailState {
  return {
    phase: "ready",
    generation: 1,
    selectedId: detail.id,
    activeRequest: null,
    detail,
    errorMessage: null,
  };
}

function state(phase: IncidentDetailState["phase"]): IncidentDetailState {
  return {
    phase,
    generation: 1,
    selectedId: 28,
    activeRequest:
      phase === "loading" ? { token: 1, generation: 1, incidentId: 28 } : null,
    detail: null,
    errorMessage: "Specific detail message",
  };
}
