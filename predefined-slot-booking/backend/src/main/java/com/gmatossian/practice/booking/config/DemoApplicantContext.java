package com.gmatossian.practice.booking.config;

import org.springframework.stereotype.Component;

@Component
public class DemoApplicantContext {
    // DemoData creates this applicant first in a fresh in-memory database. No real authentication.
    public long applicantId() { return 1L; }
}
