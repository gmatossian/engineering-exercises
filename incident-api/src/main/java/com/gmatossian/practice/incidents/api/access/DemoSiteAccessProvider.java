package com.gmatossian.practice.incidents.api.access;

import org.springframework.stereotype.Component;

import java.util.Set;

/** Local exercise stand-in for the authenticated user's server-side access scope. */
@Component
public class DemoSiteAccessProvider {


    public Set<String> authorizedSiteIds() {
        // Fixed demo user: site-c is deliberately unavailable. No authentication yet.
        return Set.of("site-a", "site-b");
    }
}
