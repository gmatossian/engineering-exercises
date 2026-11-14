package com.gmatossian.practice.incidents.repository.projection;

import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;

import java.time.Instant;

/** Internal list-query projection, separate from the HTTP response DTO. */
public record IncidentSummary(
        long id,
        String siteId,
        String type,
        IncidentSeverity severity,
        IncidentStatus status,
        Instant occurredAt
) {
}
