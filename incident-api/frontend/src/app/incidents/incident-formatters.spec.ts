import {
  formatSiteLabel,
  formatZonedTime,
  INCIDENT_LIST_ERROR_FALLBACK,
  normalizeIncidentListError,
} from './incident-formatters';

describe('incident formatters', () => {
  it('maps the configured site IDs and preserves unknown IDs', () => {
    expect(formatSiteLabel('site-a')).toBe('Site A');
    expect(formatSiteLabel('site-b')).toBe('Site B');
    expect(formatSiteLabel('site-unknown')).toBe('site-unknown');
  });

  it('formats an instant with a deterministic date, time, and visible zone', () => {
    const formatted = formatZonedTime('2026-11-16T20:05:00Z', 'en-US', {
      timeZone: 'America/Los_Angeles',
    });

    expect(formatted).toContain('Nov 16, 2026');
    expect(formatted).toContain('12:05 PM');
    expect(formatted).toMatch(/PST|GMT-8/);
  });

  it('prefers a non-blank detail message, then a non-blank error message', () => {
    expect(normalizeIncidentListError({ detail: ' Specific detail ', error: 'Other error' })).toBe(
      'Specific detail',
    );
    expect(normalizeIncidentListError({ detail: ' ', error: ' API unavailable ' })).toBe(
      'API unavailable',
    );
  });

  it.each([null, undefined, 'not json', [], { detail: 42 }, { error: '' }, { message: 'nope' }])(
    'uses the safe fallback for an unreadable or unsupported body: %j',
    (body) => {
      expect(normalizeIncidentListError(body)).toBe(INCIDENT_LIST_ERROR_FALLBACK);
    },
  );
});
