package com.gmatossian.practice.incidents.repository;

import java.time.Instant;

/** Position of the last returned incident in the fixed occurrence-time/ID ordering. */
public record Cursor(
        long lastId,
        Instant lastOccurredAt
) {
}
