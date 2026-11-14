package com.gmatossian.practice.incidents.api.dto;

import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;

import java.time.Instant;

public record IncidentSummaryResponse(
        long id,
        String siteId,
        String type,
        IncidentSeverity severity,
        IncidentStatus status,
        Instant occurredAt
) {
}
