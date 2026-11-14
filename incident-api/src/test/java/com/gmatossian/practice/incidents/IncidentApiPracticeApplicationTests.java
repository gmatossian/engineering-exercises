package com.gmatossian.practice.incidents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class IncidentApiPracticeApplicationTests {

    @Autowired
    private JdbcClient jdbc;

    @Test
    void seedsEnoughOpenIncidentsForMultiplePagesAcrossSitesAndSeverities() {
        assertEquals(96L, jdbc.sql("SELECT COUNT(*) FROM incidents").query(Long.class).single());

        for (String site : List.of("site-a", "site-b", "site-c")) {
            long count = jdbc.sql("SELECT COUNT(*) FROM incidents WHERE site_id = :site AND status = 'OPEN'")
                    .param("site", site)
                    .query(Long.class)
                    .single();
            assertTrue(count > 20, "Expected multiple default-size pages for " + site);
        }

        for (String severity : List.of("LOW", "MEDIUM", "HIGH")) {
            long count = jdbc.sql("SELECT COUNT(*) FROM incidents WHERE severity = :severity AND status = 'OPEN'")
                    .param("severity", severity)
                    .query(Long.class)
                    .single();
            assertTrue(count > 20, "Expected multiple default-size pages for " + severity);
        }

        for (String status : List.of("OPEN", "ACKNOWLEDGED", "RESOLVED")) {
            assertTrue(jdbc.sql("SELECT COUNT(*) FROM incidents WHERE status = :status")
                    .param("status", status).query(Long.class).single() > 0);
        }
    }

    @Test
    void preservesAbsoluteOccurrenceTimesAndProvidesTiesForPagination() {
        Instant first = jdbc.sql("SELECT occurred_at FROM incidents WHERE id = 1")
                .query(OffsetDateTime.class).single().toInstant();
        Instant second = jdbc.sql("SELECT occurred_at FROM incidents WHERE id = 2")
                .query(OffsetDateTime.class).single().toInstant();

        assertEquals(Instant.parse("2026-11-12T18:30:00Z"), first);
        assertEquals(first, second, "The fixture must exercise the ID tie-breaker");
    }

    @Test
    void seedsActivityHistoryAndIncludesAnIncidentWithoutHistory() {
        assertEquals(8L, jdbc.sql("SELECT COUNT(*) FROM incident_activities").query(Long.class).single());
        assertTrue(jdbc.sql("SELECT COUNT(*) FROM incident_activities WHERE incident_id = 1")
                .query(Long.class).single() > 0);
        assertEquals(0L, jdbc.sql("SELECT COUNT(*) FROM incident_activities WHERE incident_id = 4")
                .query(Long.class).single());
    }

}
