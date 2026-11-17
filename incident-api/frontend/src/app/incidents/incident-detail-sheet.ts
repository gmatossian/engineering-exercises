import {
  AfterViewInit,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from "@angular/core";

import { formatSiteLabel, formatZonedTime } from "./incident-formatters";
import { IncidentDetailState } from "./incident-detail.machine";

@Component({
  selector: "app-incident-detail-sheet",
  templateUrl: "./incident-detail-sheet.html",
  styleUrl: "./incident-detail-sheet.css",
  host: { "(document:keydown)": "onDocumentKeydown($event)" },
})
export class IncidentDetailSheet implements AfterViewInit {
  readonly state = input.required<IncidentDetailState>();
  readonly retry = output<void>();
  readonly close = output<void>();

  private readonly dialog =
    viewChild.required<ElementRef<HTMLElement>>("dialog");
  private readonly closeButton =
    viewChild.required<ElementRef<HTMLButtonElement>>("closeButton");

  readonly formatSiteLabel = formatSiteLabel;
  readonly formatZonedTime = formatZonedTime;

  ngAfterViewInit(): void {
    this.closeButton().nativeElement.focus();
  }

  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close.emit();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }

    const dialog = this.dialog().nativeElement;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute("hidden"));

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (active === last || !dialog.contains(active))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
}
