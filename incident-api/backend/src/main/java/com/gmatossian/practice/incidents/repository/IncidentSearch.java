package com.gmatossian.practice.incidents.repository;

import com.gmatossian.practice.incidents.domain.IncidentSeverity;

/**
 * Repository search criteria. Null filters impose no additional restriction;
 * a null cursor selects the first page. Authorization scope is supplied separately.
 */
public record  IncidentSearch(
        String siteId,
        IncidentSeverity severity,
        Cursor after,
        int fetchLimit
) {
}
