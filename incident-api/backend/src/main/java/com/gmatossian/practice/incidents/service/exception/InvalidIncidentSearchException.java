package com.gmatossian.practice.incidents.service.exception;

/** Invalid search input; the HTTP layer should translate this to 400. */
public class InvalidIncidentSearchException extends IllegalArgumentException {

    public InvalidIncidentSearchException(String message) {
        super(message);
    }

    public InvalidIncidentSearchException(String message, Throwable cause) {
        super(message, cause);
    }
}
