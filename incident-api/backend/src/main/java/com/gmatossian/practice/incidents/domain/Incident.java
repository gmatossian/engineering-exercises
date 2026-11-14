package com.gmatossian.practice.incidents.domain;

import java.time.Instant;
import java.util.List;

public record Incident(
        long id,
        String siteId,
        String type,
        IncidentSeverity severity,
        IncidentStatus status,
        Instant occurredAt,
        String description,
        List<IncidentActivity> activityHistory
) {
    public Incident {
        activityHistory = List.copyOf(activityHistory);
    }
}
