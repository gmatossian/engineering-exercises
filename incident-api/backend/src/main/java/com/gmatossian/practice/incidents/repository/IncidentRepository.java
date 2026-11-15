package com.gmatossian.practice.incidents.repository;

import com.gmatossian.practice.incidents.domain.Incident;
import com.gmatossian.practice.incidents.domain.IncidentActivity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;
import com.gmatossian.practice.incidents.repository.projection.IncidentSummary;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface IncidentRepository {

    /**
     * Finds OPEN incidents within the supplied access scope, ordered by occurrence
     * time descending and then ID descending. A null site/severity filter imposes
     * no additional restriction; a null cursor starts at the beginning.
     * Returns at most fetchLimit summaries; descriptions and activity histories
     * are not loaded by this query.
     * An empty access scope or a requested site outside that scope returns no rows;
     * the service is responsible for translating unauthorized requests to HTTP 403.
     */
    List<IncidentSummary> search(Set<String> authorizedSiteIds, IncidentSearch search);

    /** Loads any-status details and ordered history; the service must check site access. */
    Optional<Incident> findById(long id);

    /** Returns false if the incident no longer has the expected status (or is missing). */
    boolean updateStatus(long id, IncidentStatus expectedStatus, IncidentStatus newStatus);

    /** Called in the same service transaction as the status change. */
    void addActivity(long incidentId, IncidentActivity activity);
}
