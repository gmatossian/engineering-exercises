package com.gmatossian.practice.incidents.service.exception;

public class InvalidIncidentTransitionException extends RuntimeException {

    public InvalidIncidentTransitionException(String message) {
        super(message);
    }
}
