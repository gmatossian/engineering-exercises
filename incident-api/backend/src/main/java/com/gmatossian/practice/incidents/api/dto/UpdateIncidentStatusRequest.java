package com.gmatossian.practice.incidents.api.dto;

import com.gmatossian.practice.incidents.domain.IncidentStatus;

public record UpdateIncidentStatusRequest(IncidentStatus status) {
}
