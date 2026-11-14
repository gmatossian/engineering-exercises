package com.gmatossian.practice.incidents.api;

import com.gmatossian.practice.incidents.repository.Cursor;
import com.gmatossian.practice.incidents.service.cursor.IncidentCursorCodec;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:incident_http;DB_CLOSE_ON_EXIT=FALSE")
@AutoConfigureMockMvc
class IncidentControllerTests {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private IncidentCursorCodec cursorCodec;






    @Test
    void returnsDefaultSummaryPageForOnlyTheDemoUsersSites() throws Exception {
        mvc.perform(get("/incidents"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.incidents.length()").value(20))
                .andExpect(jsonPath("$.incidents[0].id").value(5))
                .andExpect(jsonPath("$.incidents[0].occurredAt").value("2026-11-12T18:30:00Z"))
                .andExpect(jsonPath("$.incidents[*].siteId", everyItem(isIn(Set.of("site-a", "site-b")))))
                .andExpect(jsonPath("$.incidents[*].status", everyItem(is("OPEN"))))
                .andExpect(jsonPath("$.incidents[0].description").doesNotExist())
                .andExpect(jsonPath("$.incidents[0].activityHistory").doesNotExist())
                .andExpect(jsonPath("$.nextCursor").isString());
    }

    @Test
    void bindsAndCombinesSiteSeverityAndLimitParameters() throws Exception {
        mvc.perform(get("/incidents").param("siteId", "site-a").param("severity", "HIGH").param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incidents[*].id", contains(7, 16, 25)))
                .andExpect(jsonPath("$.incidents[*].siteId", everyItem(is("site-a"))))
                .andExpect(jsonPath("$.incidents[*].severity", everyItem(is("HIGH"))))
                .andExpect(jsonPath("$.nextCursor").isString());
    }

    @Test
    void followsHttpCursorsThroughAllFiftyTwoAuthorizedOpenIncidents() throws Exception {
        List<Integer> ids = new ArrayList<>();
        List<Integer> pageSizes = new ArrayList<>();
        String cursor = null;

        for (int page = 0; page < 10; page++) {
            var request = get("/incidents");
            if (cursor != null) {
                request.param("cursor", cursor);
            }
            String body = mvc.perform(request)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.incidents[*].siteId", everyItem(isIn(Set.of("site-a", "site-b")))))
                    .andReturn().getResponse().getContentAsString();
            List<Integer> pageIds = JsonPath.read(body, "$.incidents[*].id");
            ids.addAll(pageIds);
            pageSizes.add(pageIds.size());
            cursor = JsonPath.read(body, "$.nextCursor");
            if (cursor == null) {
                break;
            }
        }

        assertNull(cursor);
        assertEquals(List.of(20, 20, 12), pageSizes);
        assertEquals(52, ids.size());
        assertEquals(52, new HashSet<>(ids).size());
    }

    @Test
    void returnsBadRequestForOutOfRangeOrNonNumericLimits() throws Exception {
        for (String limit : List.of("0", "101", "abc")) {
            mvc.perform(get("/incidents").param("limit", limit))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                    .andExpect(jsonPath("$.status").value(400));
        }
    }

    @Test
    void returnsBadRequestForUnrecognizedSeverity() throws Exception {
        mvc.perform(get("/incidents").param("severity", "EXTREME"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value("Invalid value for parameter 'severity'"));
    }

    @Test
    void returnsBadRequestForMalformedOrBlankCursor() throws Exception {
        for (String token : List.of("not-a-cursor", "")) {
            mvc.perform(get("/incidents").param("cursor", token))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.detail").value("Invalid cursor"));
        }
    }

    @Test
    void queryParametersCannotExpandTheServerSideDemoScope() throws Exception {
        mvc.perform(get("/incidents").param("siteId", "site-c").param("authorizedSiteIds", "site-c"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.detail").value("Requested site is outside the authorized scope"));
    }

    @Test
    void returnsAnEmptySuccessfulPageWhenNoIncidentsMatch() throws Exception {
        String cursor = cursorCodec.encode(new Cursor(0, Instant.parse("2000-01-01T00:00:00Z")));

        mvc.perform(get("/incidents").param("cursor", cursor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.incidents").isEmpty())
                .andExpect(jsonPath("$.nextCursor").value(nullValue()));
    }

    @Test
    void returnsDetailsAndOrderedHistoryWithoutAPageWrapper() throws Exception {
        mvc.perform(get("/incidents/28"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(28))
                .andExpect(jsonPath("$.siteId").value("site-a"))
                .andExpect(jsonPath("$.status").value("ACKNOWLEDGED"))
                .andExpect(jsonPath("$.description").value("Practice incident 28: DOOR_FORCED_OPEN at site-a."))
                .andExpect(jsonPath("$.activityHistory.length()").value(2))
                .andExpect(jsonPath("$.activityHistory[*].action", contains("CREATED", "ACKNOWLEDGED")))
                .andExpect(jsonPath("$.activityHistory[0].actorId").value("operator-a"))
                .andExpect(jsonPath("$.activityHistory[0].occurredAt").value("2026-11-12T18:26:00Z"))
                .andExpect(jsonPath("$.incidents").doesNotExist())
                .andExpect(jsonPath("$.nextCursor").doesNotExist());
    }

    @Test
    void returnsDetailsWithEmptyActivityHistory() throws Exception {
        mvc.perform(get("/incidents/4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(4))
                .andExpect(jsonPath("$.description").isString())
                .andExpect(jsonPath("$.activityHistory").isEmpty());
    }

    @Test
    void returnsNotFoundForMissingIncident() throws Exception {
        mvc.perform(get("/incidents/9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Incident 9999 not found"));
    }

    @Test
    void returnsForbiddenForExistingIncidentOnAnotherSite() throws Exception {
        mvc.perform(get("/incidents/3"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void returnsBadRequestForNonNumericPathId() throws Exception {
        mvc.perform(get("/incidents/not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.detail").value("Invalid value for parameter 'id'"));
    }
}
