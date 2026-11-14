package com.gmatossian.practice.incidents.service.exception;

public class IncidentNotFoundException extends RuntimeException {

    public IncidentNotFoundException(long id) {
        super("Incident " + id + " not found");
    }
}
