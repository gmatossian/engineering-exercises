package com.gmatossian.practice.incidents.api.dto;

import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;

import java.time.Instant;
import java.util.List;

public record IncidentDetailResponse(
        long id,
        String siteId,
        String type,
        IncidentSeverity severity,
        IncidentStatus status,
        Instant occurredAt,
        String description,
        List<IncidentActivityResponse> activityHistory
) {
    public IncidentDetailResponse {
        activityHistory = List.copyOf(activityHistory);
    }
}
