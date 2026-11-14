package com.gmatossian.practice.incidents.repository;

import com.gmatossian.practice.incidents.domain.Incident;
import com.gmatossian.practice.incidents.domain.IncidentActivity;
import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.domain.IncidentStatus;
import com.gmatossian.practice.incidents.repository.projection.IncidentSummary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Repository
public class JdbcIncidentRepository implements IncidentRepository {

    private final JdbcClient jdbc;

    public JdbcIncidentRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<IncidentSummary> search(Set<String> authorizedSiteIds, IncidentSearch search) {
        Objects.requireNonNull(authorizedSiteIds, "authorizedSiteIds");
        Objects.requireNonNull(search, "search");
        if (search.fetchLimit() < 1) {
            throw new IllegalArgumentException("fetchLimit must be positive");
        }

        // Never omit the access restriction, even when no site filter was supplied.
        if (authorizedSiteIds.isEmpty()
                || (search.siteId() != null && !authorizedSiteIds.contains(search.siteId()))) {
            return List.of();
        }

        StringBuilder sql = new StringBuilder("""
                SELECT id, site_id, type, severity, status, occurred_at
                FROM incidents
                WHERE site_id IN (:authorizedSiteIds)
                  AND status = 'OPEN'
                """);
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("authorizedSiteIds", authorizedSiteIds);

        if (search.siteId() != null) {
            sql.append("AND site_id = :siteId\n");
            parameters.put("siteId", search.siteId());
        }
        if (search.severity() != null) {
            sql.append("AND severity = :severity\n");
            parameters.put("severity", search.severity().name());
        }
        if (search.after() != null) {
            // For descending order, continue with older timestamps or lower tied IDs.
            sql.append("""
                    AND (occurred_at < :lastOccurredAt
                         OR (occurred_at = :lastOccurredAt AND id < :lastId))
                    """);
            parameters.put("lastOccurredAt", search.after().lastOccurredAt().atOffset(ZoneOffset.UTC));
            parameters.put("lastId", search.after().lastId());
        }

        sql.append("ORDER BY occurred_at DESC, id DESC\nLIMIT :fetchLimit");
        parameters.put("fetchLimit", search.fetchLimit());

        return jdbc.sql(sql.toString())
                .params(parameters)
                .query((rs, rowNum) -> new IncidentSummary(
                        rs.getLong("id"),
                        rs.getString("site_id"),
                        rs.getString("type"),
                        IncidentSeverity.valueOf(rs.getString("severity")),
                        IncidentStatus.valueOf(rs.getString("status")),
                        rs.getObject("occurred_at", OffsetDateTime.class).toInstant()))
                .list();
    }

    @Override
    public Optional<Incident> findById(long id) {
        return jdbc.sql("""
                        SELECT id, site_id, type, severity, status, occurred_at, description
                        FROM incidents
                        WHERE id = :id
                        """)
                .param("id", id)
                .query((rs, rowNum) -> new IncidentRow(
                        rs.getLong("id"),
                        rs.getString("site_id"),
                        rs.getString("type"),
                        IncidentSeverity.valueOf(rs.getString("severity")),
                        IncidentStatus.valueOf(rs.getString("status")),
                        rs.getObject("occurred_at", OffsetDateTime.class).toInstant(),
                        rs.getString("description")))
                .optional()
                .map(row -> new Incident(row.id(), row.siteId(), row.type(), row.severity(),
                        row.status(), row.occurredAt(), row.description(), loadActivityHistory(id)));
    }



    private List<IncidentActivity> loadActivityHistory(long incidentId) {
        return jdbc.sql("""
                        SELECT action, actor_id, occurred_at
                        FROM incident_activities
                        WHERE incident_id = :incidentId
                        ORDER BY occurred_at ASC, id ASC
                        """)
                .param("incidentId", incidentId)
                .query((rs, rowNum) -> new IncidentActivity(rs.getString("action"), rs.getString("actor_id"),
                        rs.getObject("occurred_at", OffsetDateTime.class).toInstant()))
                .list();
    }

    private record IncidentRow(long id, String siteId, String type,
                               IncidentSeverity severity, IncidentStatus status,
                               Instant occurredAt, String description) {
    }
}
