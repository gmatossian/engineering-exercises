package com.gmatossian.practice.incidents.service;

import com.gmatossian.practice.incidents.api.dto.IncidentActivityResponse;
import com.gmatossian.practice.incidents.api.dto.IncidentDetailResponse;
import com.gmatossian.practice.incidents.api.dto.IncidentSummaryResponse;
import com.gmatossian.practice.incidents.domain.Incident;
import com.gmatossian.practice.incidents.domain.IncidentActivity;
import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;
import com.gmatossian.practice.incidents.repository.Cursor;
import com.gmatossian.practice.incidents.repository.IncidentRepository;
import com.gmatossian.practice.incidents.repository.IncidentSearch;
import com.gmatossian.practice.incidents.repository.projection.IncidentSummary;
import com.gmatossian.practice.incidents.service.cursor.IncidentCursorCodec;
import com.gmatossian.practice.incidents.service.exception.IncidentNotFoundException;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentSearchException;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentTransitionException;
import com.gmatossian.practice.incidents.service.exception.SiteAccessDeniedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.*;

class IncidentServiceTests {

    private static final Set<String> ALL_SITES = Set.of("site-a", "site-b");
    private static final Instant TIME = Instant.parse("2026-11-12T18:30:00Z");

    private IncidentRepository repository;
    private IncidentCursorCodec codec;
    private IncidentService service;

    @BeforeEach
    void setUp() {
        repository = mock(IncidentRepository.class);
        codec = new IncidentCursorCodec();
        service = new IncidentService(repository, codec);
    }

    @Test
    void aConflictingWriteDoesNotAddHistory() {
        when(repository.findById(1)).thenReturn(Optional.of(new Incident(1, "site-a", "ALARM_TRIGGERED",
                IncidentSeverity.HIGH, IncidentStatus.OPEN, TIME, "Alarm", List.of())));
        when(repository.updateStatus(1, IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED)).thenReturn(false);

        assertThrows(InvalidIncidentTransitionException.class,
                () -> service.updateStatus(ALL_SITES, 1, IncidentStatus.ACKNOWLEDGED, "demo-user"));

        verify(repository, never()).addActivity(anyLong(), any());
    }

    @Test
    void defaultsToTwentyAndBuildsCursorFromTwentiethRatherThanLookAheadRecord() {
        when(repository.search(anySet(), any())).thenReturn(summaries(21));

        var response = service.search(ALL_SITES, null, null, null, null);

        verify(repository).search(ALL_SITES, new IncidentSearch(null, null, null, 21));
        assertEquals(20, response.incidents().size());
        assertEquals(new IncidentSummaryResponse(100, "site-a", "ALARM_TRIGGERED",
                IncidentSeverity.HIGH, IncidentStatus.OPEN, TIME), response.incidents().getFirst());
        assertEquals(81L, response.incidents().getLast().id());
        assertEquals(new Cursor(81, TIME.minusSeconds(19)), codec.decode(response.nextCursor()));
    }

    @Test
    void exactSizePageHasNoNextCursor() {
        when(repository.search(anySet(), any())).thenReturn(summaries(3));

        var response = service.search(ALL_SITES, null, null, 3, null);

        assertEquals(3, response.incidents().size());
        assertNull(response.nextCursor());
        verify(repository).search(ALL_SITES, new IncidentSearch(null, null, null, 4));
    }

    @Test
    void shortPageHasNoNextCursor() {
        when(repository.search(anySet(), any())).thenReturn(summaries(2));

        var response = service.search(ALL_SITES, null, null, 3, null);

        assertEquals(2, response.incidents().size());
        assertNull(response.nextCursor());
    }

    @Test
    void emptyResultsHaveAnEmptyListAndNoCursor() {
        when(repository.search(anySet(), any())).thenReturn(List.of());

        var response = service.search(ALL_SITES, null, null, 20, null);

        assertTrue(response.incidents().isEmpty());
        assertNull(response.nextCursor());
    }

    @Test
    void acceptsMaximumLimitAndFetchesOneExtra() {
        when(repository.search(anySet(), any())).thenReturn(List.of());

        service.search(ALL_SITES, null, null, 100, null);

        verify(repository).search(ALL_SITES, new IncidentSearch(null, null, null, 101));
    }

    @Test
    void rejectsInvalidLimitsBeforeQuerying() {
        for (int limit : new int[]{-1, 0, 101, Integer.MAX_VALUE}) {
            assertThrows(InvalidIncidentSearchException.class,
                    () -> service.search(ALL_SITES, null, null, limit, null));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsUnrecognizedSiteValuesThroughTheAccessCheck() {
        for (String site : List.of("", "   ", "x".repeat(101))) {
            assertThrows(SiteAccessDeniedException.class,
                    () -> service.search(ALL_SITES, site, null, 20, null));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsAnExplicitUnauthorizedSiteBeforeQuerying() {
        assertThrows(SiteAccessDeniedException.class,
                () -> service.search(Set.of("site-a"), "site-b", null, 20, null));
        verifyNoInteractions(repository);
    }

    @Test
    void noAuthorizedSitesProducesAnEmptyPageWithoutQuerying() {
        var response = service.search(Set.of(), null, null, 20, null);

        assertTrue(response.incidents().isEmpty());
        assertNull(response.nextCursor());
        verifyNoInteractions(repository);
    }

    @Test
    void passesDecodedCursorFiltersAndScopeToRepository() {
        Cursor after = new Cursor(100, TIME);
        String token = codec.encode(after);
        when(repository.search(anySet(), any())).thenReturn(List.of());

        service.search(ALL_SITES, "site-a", IncidentSeverity.HIGH, 7, token);

        verify(repository).search(ALL_SITES, new IncidentSearch("site-a", IncidentSeverity.HIGH, after, 8));
    }

    @Test
    void rejectsMalformedTokensBeforeQuerying() {
        for (String token : List.of("", " ", "not-a-cursor", "a.b.c")) {
            assertThrows(InvalidIncidentSearchException.class,
                    () -> service.search(ALL_SITES, null, null, 20, token));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void repositoryFailuresPropagateInsteadOfBecomingEmptyResults() {
        var failure = new DataAccessResourceFailureException("Database unavailable");
        when(repository.search(anySet(), any())).thenThrow(failure);

        assertSame(failure, assertThrows(DataAccessResourceFailureException.class,
                () -> service.search(ALL_SITES, null, null, 20, null)));
    }

    @Test
    void mapsDetailsAndNestedActivityResponses() {
        var incident = new Incident(28, "site-a", "ALARM_TRIGGERED", IncidentSeverity.HIGH,
                IncidentStatus.ACKNOWLEDGED, TIME, "Incident description", List.of(
                new IncidentActivity("CREATED", "operator-a", TIME),
                new IncidentActivity("ACKNOWLEDGED", "operator-b", TIME.plusSeconds(10))));
        when(repository.findById(28)).thenReturn(Optional.of(incident));

        var response = service.getDetails(ALL_SITES, 28);

        assertEquals(new IncidentDetailResponse(28, "site-a", "ALARM_TRIGGERED", IncidentSeverity.HIGH,
                IncidentStatus.ACKNOWLEDGED, TIME, "Incident description", List.of(
                new IncidentActivityResponse("CREATED", "operator-a", TIME),
                new IncidentActivityResponse("ACKNOWLEDGED", "operator-b", TIME.plusSeconds(10)))), response);
        verify(repository).findById(28);
    }

    @Test
    void emptyDetailAccessScopeThrowsAccessDeniedWithoutQuerying() {
        assertThrows(SiteAccessDeniedException.class, () -> service.getDetails(Set.of(), 28));
        verifyNoInteractions(repository);
    }

    @Test
    void missingDetailsThrowNotFound() {
        when(repository.findById(9999)).thenReturn(Optional.empty());

        assertThrows(IncidentNotFoundException.class, () -> service.getDetails(ALL_SITES, 9999));
    }

    @Test
    void existingDetailsOutsideScopeThrowAccessDenied() {
        when(repository.findById(3)).thenReturn(Optional.of(new Incident(3, "site-c", "ALARM_TRIGGERED",
                IncidentSeverity.HIGH, IncidentStatus.OPEN, TIME, "Forbidden incident", List.of())));

        assertThrows(SiteAccessDeniedException.class, () -> service.getDetails(ALL_SITES, 3));
    }

    private static List<IncidentSummary> summaries(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> new IncidentSummary(100L - i, "site-a", "ALARM_TRIGGERED",
                        IncidentSeverity.HIGH, IncidentStatus.OPEN, TIME.minusSeconds(i)))
                .toList();
    }
}
