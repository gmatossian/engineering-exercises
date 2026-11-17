export const INCIDENT_LIST_ERROR_FALLBACK = "We couldn't load incidents. Please try again.";

export function formatSiteLabel(siteId: string): string {
  switch (siteId) {
    case 'site-a':
      return 'Site A';
    case 'site-b':
      return 'Site B';
    default:
      return siteId;
  }
}

export function formatZonedTime(
  instant: string,
  locales?: Intl.LocalesArgument,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const formatter = new Intl.DateTimeFormat(locales, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options,
  });

  return formatter.format(new Date(instant));
}

export function normalizeIncidentListError(body: unknown): string {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return INCIDENT_LIST_ERROR_FALLBACK;
  }

  const candidate = body as Record<string, unknown>;
  const detail = normalizedMessage(candidate['detail']);
  if (detail) {
    return detail;
  }

  return normalizedMessage(candidate['error']) ?? INCIDENT_LIST_ERROR_FALLBACK;
}

function normalizedMessage(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
