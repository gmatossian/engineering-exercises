package com.gmatossian.practice.incidents.api;

import com.gmatossian.practice.incidents.api.access.DemoSiteAccessProvider;
import com.gmatossian.practice.incidents.api.dto.IncidentSearchResponse;
import com.gmatossian.practice.incidents.domain.IncidentSeverity;
import com.gmatossian.practice.incidents.service.IncidentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/incidents")
public class IncidentController {

    private final IncidentService incidentService;
    private final DemoSiteAccessProvider siteAccess;

    public IncidentController(IncidentService incidentService, DemoSiteAccessProvider siteAccess) {
        this.incidentService = incidentService;
        this.siteAccess = siteAccess;
    }

    @GetMapping
    public IncidentSearchResponse search(
            @RequestParam(name = "siteId", required = false) String siteId,
            @RequestParam(name = "severity", required = false) IncidentSeverity severity,
            @RequestParam(name = "limit", required = false) Integer limit,
            @RequestParam(name = "cursor", required = false) String cursor) {
        return incidentService.search(siteAccess.authorizedSiteIds(), siteId, severity, limit, cursor);
    }


}
