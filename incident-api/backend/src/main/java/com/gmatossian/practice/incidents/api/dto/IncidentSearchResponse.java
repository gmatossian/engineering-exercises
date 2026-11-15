package com.gmatossian.practice.incidents.api.dto;

import java.util.List;

public record IncidentSearchResponse(
        List<IncidentSummaryResponse> incidents,
        String nextCursor
) {
    public IncidentSearchResponse {
        incidents = List.copyOf(incidents);
    }
}
