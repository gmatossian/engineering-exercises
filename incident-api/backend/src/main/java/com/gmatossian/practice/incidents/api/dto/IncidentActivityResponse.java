package com.gmatossian.practice.incidents.api.dto;

import java.time.Instant;

public record IncidentActivityResponse(
        String action,
        String actorId,
        Instant occurredAt
) {
}
