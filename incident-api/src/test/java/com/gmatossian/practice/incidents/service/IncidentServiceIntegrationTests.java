package com.gmatossian.practice.incidents.service;

import com.gmatossian.practice.incidents.api.dto.IncidentSummaryResponse;
import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;
import com.gmatossian.practice.incidents.repository.IncidentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class IncidentServiceIntegrationTests {

    private static final Set<String> ALL_SITES = Set.of("site-a", "site-b", "site-c");

    @Autowired
    private IncidentService service;

    @Autowired
    private IncidentRepository repository;




    @Test
    void traversesAllOpenFixturesThroughEncodedContinuationTokens() {
        List<IncidentSummaryResponse> visited = new ArrayList<>();
        List<Integer> pageSizes = new ArrayList<>();
        String token = null;

        for (int page = 0; page < 10; page++) {
            var response = service.search(ALL_SITES, null, null, null, token);
            visited.addAll(response.incidents());
            pageSizes.add(response.incidents().size());
            token = response.nextCursor();
            if (token == null) {
                break;
            }
        }

        assertNull(token);
        assertEquals(List.of(20, 20, 20, 18), pageSizes);
        assertEquals(78, new HashSet<>(visited.stream().map(IncidentSummaryResponse::id).toList()).size());
        assertEquals(List.of(6L, 5L, 4L, 3L, 2L, 1L),
                visited.stream().limit(6).map(IncidentSummaryResponse::id).toList());
        assertTrue(visited.stream().allMatch(incident -> incident.status() == IncidentStatus.OPEN));
    }

    @Test
    void continuationPreservesScopeAndFiltersAndCanChangePageSize() {
        var first = service.search(Set.of("site-a"), "site-a", IncidentSeverity.LOW, 2, null);
        var second = service.search(Set.of("site-a"), "site-a", IncidentSeverity.LOW, 100, first.nextCursor());

        assertEquals(List.of(1L, 10L), first.incidents().stream().map(IncidentSummaryResponse::id).toList());
        assertNotNull(first.nextCursor());
        assertEquals(List.of(19L, 37L, 46L, 55L, 73L, 82L, 91L),
                second.incidents().stream().map(IncidentSummaryResponse::id).toList());
        assertNull(second.nextCursor());
        assertTrue(second.incidents().stream().allMatch(incident -> incident.siteId().equals("site-a")
                && incident.severity() == IncidentSeverity.LOW));
    }

    @Test
    void cursorDoesNotBypassTheCurrentAuthorizedSiteScope() {
        var first = service.search(ALL_SITES, null, null, 2, null);
        var second = service.search(Set.of("site-a"), null, null, 2, first.nextCursor());

        assertEquals(List.of(4L, 1L), second.incidents().stream().map(IncidentSummaryResponse::id).toList());
        assertTrue(second.incidents().stream().allMatch(incident -> incident.siteId().equals("site-a")));
    }
}
