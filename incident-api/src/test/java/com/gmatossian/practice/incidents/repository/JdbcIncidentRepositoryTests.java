package com.gmatossian.practice.incidents.repository;

import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;
import com.gmatossian.practice.incidents.repository.projection.IncidentSummary;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class JdbcIncidentRepositoryTests {

    private static final Set<String> ALL_SITES = Set.of("site-a", "site-b", "site-c");

    @Autowired
    private IncidentRepository repository;

    @Autowired
    private JdbcClient jdbc;

    @Test
    void restrictsToAuthorizedSitesAndOrdersNewestFirstWithIdTies() {
        List<IncidentSummary> result = repository.search(Set.of("site-a", "site-b"),
                new IncidentSearch(null, null, null, 7));

        assertEquals(List.of(5L, 4L, 2L, 1L, 11L, 10L, 8L), ids(result));
        assertTrue(result.stream().allMatch(incident -> Set.of("site-a", "site-b").contains(incident.siteId())));
        assertTrue(result.stream().allMatch(incident -> incident.status() == IncidentStatus.OPEN));
    }

    @Test
    void combinesOptionalSiteAndSeverityFilters() {
        List<IncidentSummary> result = repository.search(ALL_SITES,
                new IncidentSearch("site-b", IncidentSeverity.HIGH, null, 5));

        assertEquals(5, result.size());
        assertTrue(result.stream().allMatch(incident -> incident.siteId().equals("site-b")));
        assertTrue(result.stream().allMatch(incident -> incident.severity() == IncidentSeverity.HIGH));
        assertTrue(result.stream().allMatch(incident -> incident.status() == IncidentStatus.OPEN));
    }

    @Test
    void anEmptyAccessScopeNeverReturnsIncidents() {
        assertTrue(repository.search(Set.of(), new IncidentSearch(null, null, null, 20)).isEmpty());
    }

    @Test
    void aSiteFilterCannotExpandAccess() {
        assertTrue(repository.search(Set.of("site-a"),
                new IncidentSearch("site-b", null, null, 20)).isEmpty());
    }

    @Test
    void returnsAnEmptyListWhenNoRowsMatch() {
        assertTrue(repository.search(Set.of("missing-site"),
                new IncidentSearch(null, null, null, 20)).isEmpty());
    }

    @Test
    void fetchLimitIncludesTheServicesLookAheadRecord() {
        List<IncidentSummary> result = repository.search(ALL_SITES, new IncidentSearch(null, null, null, 21));

        assertEquals(21, result.size());
        assertEquals(22L, result.getLast().id());
    }

    @Test
    void traversesEveryOpenIncidentWithoutSkippingOrRepeatingTimestampTies() {
        List<IncidentSummary> visited = new ArrayList<>();
        Cursor cursor = null;
        boolean finished = false;

        // Simulate a service returning five records while fetching a sixth for look-ahead.
        for (int pageNumber = 0; pageNumber < 30; pageNumber++) {
            List<IncidentSummary> fetched = repository.search(ALL_SITES, new IncidentSearch(null, null, cursor, 6));
            List<IncidentSummary> page = fetched.stream().limit(5).toList();
            visited.addAll(page);
            if (fetched.size() <= 5) {
                finished = true;
                break;
            }
            IncidentSummary lastReturned = page.getLast();
            cursor = new Cursor(lastReturned.id(), lastReturned.occurredAt());
        }

        assertTrue(finished, "Pagination must reach the end");
        assertEquals(78, visited.size());
        assertEquals(78, new HashSet<>(ids(visited)).size());
        assertTrue(visited.stream().allMatch(incident -> incident.status() == IncidentStatus.OPEN));
        assertEquals(ids(visited.stream().sorted(Comparator.comparing(IncidentSummary::occurredAt)
                .thenComparingLong(IncidentSummary::id).reversed()).toList()), ids(visited));

        IncidentSummary last = visited.getLast();
        assertTrue(repository.search(ALL_SITES,
                new IncidentSearch(null, null, new Cursor(last.id(), last.occurredAt()), 6)).isEmpty());
    }

    @Test
    void newerIncidentsDoNotShiftAnExistingContinuationBoundary() {
        List<IncidentSummary> first = repository.search(ALL_SITES, new IncidentSearch(null, null, null, 2));
        IncidentSummary boundary = first.getLast();
        insertIncident(1001, OffsetDateTime.parse("2026-11-12T18:31:00Z"));

        List<IncidentSummary> next = repository.search(ALL_SITES,
                new IncidentSearch(null, null, new Cursor(boundary.id(), boundary.occurredAt()), 2));

        assertEquals(List.of(6L, 5L), ids(first));
        assertEquals(List.of(4L, 3L), ids(next));
        assertEquals(1001L, repository.search(ALL_SITES,
                new IncidentSearch(null, null, null, 1)).getFirst().id());
    }

    @Test
    void cursorPreservesNanosecondsAndComparesAbsoluteTimesAcrossOffsets() {
        insertIncident(1001, OffsetDateTime.parse("2026-11-13T10:00:00.123456789+02:00"));
        insertIncident(1002, OffsetDateTime.parse("2026-11-13T08:00:00.123456788Z"));
        IncidentSummary first = repository.search(ALL_SITES,
                new IncidentSearch(null, null, null, 1)).getFirst();

        assertEquals(1001L, first.id());
        assertEquals(Instant.parse("2026-11-13T08:00:00.123456789Z"), first.occurredAt());
        assertEquals(List.of(1002L), ids(repository.search(ALL_SITES,
                new IncidentSearch(null, null, new Cursor(first.id(), first.occurredAt()), 1))));
    }

    @Test
    void mapsAllSummaryFields() {
        IncidentSummary summary = repository.search(Set.of("site-a"),
                new IncidentSearch(null, IncidentSeverity.LOW, null, 1)).getFirst();

        assertEquals(new IncidentSummary(1L, "site-a", "DOOR_FORCED_OPEN",
                IncidentSeverity.LOW, IncidentStatus.OPEN,
                Instant.parse("2026-11-12T18:30:00Z")), summary);
    }

    @Test
    void searchNeedsOnlySummaryColumnsAndNoActivityTable() throws SQLException {
        // A separate database deliberately has neither a description column nor
        // an activity table: this search must work without reading either detail.
        try (Connection connection = DriverManager.getConnection("jdbc:h2:mem:summary_only")) {
            JdbcClient summaryJdbc = JdbcClient.create(new SingleConnectionDataSource(connection, true));
            summaryJdbc.sql("""
                    CREATE TABLE incidents (
                        id BIGINT PRIMARY KEY,
                        site_id VARCHAR(100),
                        type VARCHAR(100),
                        severity VARCHAR(10),
                        status VARCHAR(20),
                        occurred_at TIMESTAMP(9) WITH TIME ZONE
                    )
                    """).update();
            summaryJdbc.sql("""
                    INSERT INTO incidents (id, site_id, type, severity, status, occurred_at)
                    VALUES (1, 'site-a', 'ALARM_TRIGGERED', 'HIGH', 'OPEN',
                            TIMESTAMP WITH TIME ZONE '2026-11-12 18:30:00+00:00')
                    """).update();

            IncidentRepository summaryRepository = new JdbcIncidentRepository(summaryJdbc);
            assertEquals(List.of(new IncidentSummary(1L, "site-a", "ALARM_TRIGGERED",
                            IncidentSeverity.HIGH, IncidentStatus.OPEN,
                            Instant.parse("2026-11-12T18:30:00Z"))),
                    summaryRepository.search(Set.of("site-a"), new IncidentSearch(null, null, null, 2)));
        }
    }

    @Test
    void treatsSqlLookingSiteIdsAsParameterValues() {
        String site = "site-a' OR '1'='1";
        assertTrue(repository.search(Set.of("site-a", site),
                new IncidentSearch(site, null, null, 20)).isEmpty());
    }

    @Test
    void rejectsNonPositiveFetchLimits() {
        assertThrows(IllegalArgumentException.class,
                () -> repository.search(ALL_SITES, new IncidentSearch(null, null, null, 0)));
        assertThrows(IllegalArgumentException.class,
                () -> repository.search(ALL_SITES, new IncidentSearch(null, null, null, -1)));
    }





    private void insertIncident(long id, OffsetDateTime time) {
        jdbc.sql("""
                        INSERT INTO incidents (id, site_id, type, severity, status, occurred_at, description)
                        VALUES (:id, 'site-a', 'ALARM_TRIGGERED', 'HIGH', 'OPEN', :time, 'Test incident')
                        """)
                .param("id", id)
                .param("time", time)
                .update();
    }

    private static List<Long> ids(List<IncidentSummary> incidents) {
        return incidents.stream().map(IncidentSummary::id).toList();
    }
}
