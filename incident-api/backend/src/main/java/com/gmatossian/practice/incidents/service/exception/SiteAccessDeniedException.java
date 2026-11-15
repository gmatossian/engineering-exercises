package com.gmatossian.practice.incidents.service.exception;

/** Requested site is outside the caller's access scope; HTTP translation is 403. */
public class SiteAccessDeniedException extends RuntimeException {

    public SiteAccessDeniedException() {
        super("Requested site is outside the authorized scope");
    }
}
