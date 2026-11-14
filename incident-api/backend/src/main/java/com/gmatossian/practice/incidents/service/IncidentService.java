package com.gmatossian.practice.incidents.service;

import com.gmatossian.practice.incidents.api.dto.IncidentActivityResponse;
import com.gmatossian.practice.incidents.api.dto.IncidentDetailResponse;
import com.gmatossian.practice.incidents.api.dto.IncidentSearchResponse;
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
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentUpdateException;
import com.gmatossian.practice.incidents.service.exception.SiteAccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
public class IncidentService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final IncidentRepository repository;
    private final IncidentCursorCodec cursorCodec;

    public IncidentService(IncidentRepository repository, IncidentCursorCodec cursorCodec) {
        this.repository = repository;
        this.cursorCodec = cursorCodec;
    }

    /** authorizedSiteIds must come from trusted server-side identity/access data. */
    @Transactional(readOnly = true)
    public IncidentSearchResponse search(Set<String> authorizedSiteIds, String siteId,
                                         IncidentSeverity severity, Integer limit, String cursorToken) {
        int pageSize = limit == null ? DEFAULT_LIMIT : limit;
        if (pageSize < 1 || pageSize > MAX_LIMIT) {
            throw new InvalidIncidentSearchException("limit must be between 1 and 100");
        }
        if (siteId != null && !authorizedSiteIds.contains(siteId)) {
            throw new SiteAccessDeniedException();
        }

        Cursor after = cursorToken == null ? null : cursorCodec.decode(cursorToken);
        if (authorizedSiteIds.isEmpty()) {
            return new IncidentSearchResponse(List.of(), null);
        }

        List<IncidentSummary> fetched = repository.search(authorizedSiteIds,
                new IncidentSearch(siteId, severity, after, pageSize + 1));
        boolean hasMore = fetched.size() > pageSize;
        List<IncidentSummary> page = fetched.subList(0, Math.min(pageSize, fetched.size()));

        String nextCursor = null;
        if (hasMore) {
            IncidentSummary lastReturned = page.getLast();
            nextCursor = cursorCodec.encode(new Cursor(lastReturned.id(), lastReturned.occurredAt()));
        }

        List<IncidentSummaryResponse> responses = page.stream()
                .map(incident -> new IncidentSummaryResponse(incident.id(), incident.siteId(), incident.type(),
                        incident.severity(), incident.status(), incident.occurredAt()))
                .toList();
        return new IncidentSearchResponse(responses, nextCursor);
    }

    @Transactional(readOnly = true)
    public IncidentDetailResponse getDetails(Set<String> authorizedSiteIds, long id) {
        return toDetailResponse(findAccessibleIncident(authorizedSiteIds, id));
    }

    @Transactional
    public IncidentDetailResponse updateStatus(Set<String> authorizedSiteIds, long id,
                                               IncidentStatus newStatus, String actorId) {
        Incident incident = findAccessibleIncident(authorizedSiteIds, id);
        if (newStatus == null) {
            throw new InvalidIncidentUpdateException("status is required");
        }
        if (incident.status() == newStatus) {
            return toDetailResponse(incident); // No duplicate history entry on a retry.
        }

        // Exercise rules: forward transitions only; resolved incidents cannot be reopened.
        boolean allowed = switch (incident.status()) {
            case OPEN -> newStatus == IncidentStatus.ACKNOWLEDGED || newStatus == IncidentStatus.RESOLVED;
            case ACKNOWLEDGED -> newStatus == IncidentStatus.RESOLVED;
            case RESOLVED -> false;
        };
        if (!allowed) {
            throw new InvalidIncidentTransitionException(
                    "Cannot change status from " + incident.status() + " to " + newStatus);
        }

        if (!repository.updateStatus(id, incident.status(), newStatus)) {
            throw new InvalidIncidentTransitionException("Incident changed; reload it before retrying");
        }
        repository.addActivity(id, new IncidentActivity(newStatus.name(), actorId, Instant.now()));
        return getDetails(authorizedSiteIds, id);
    }

    private Incident findAccessibleIncident(Set<String> authorizedSiteIds, long id) {
        if (authorizedSiteIds.isEmpty()) {
            throw new SiteAccessDeniedException();
        }

        Incident incident = repository.findById(id)
                .orElseThrow(() -> new IncidentNotFoundException(id));
        if (!authorizedSiteIds.contains(incident.siteId())) {
            throw new SiteAccessDeniedException();
        }

        return incident;
    }

    private IncidentDetailResponse toDetailResponse(Incident incident) {
        List<IncidentActivityResponse> activities = incident.activityHistory().stream()
                .map(activity -> new IncidentActivityResponse(activity.action(), activity.actorId(),
                        activity.occurredAt()))
                .toList();
        return new IncidentDetailResponse(incident.id(), incident.siteId(), incident.type(),
                incident.severity(), incident.status(), incident.occurredAt(),
                incident.description(), activities);
    }
}
