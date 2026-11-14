package com.gmatossian.practice.incidents.domain;

import java.time.Instant;

public record IncidentActivity(
        String action,
        String actorId,
        Instant occurredAt
) {
}
