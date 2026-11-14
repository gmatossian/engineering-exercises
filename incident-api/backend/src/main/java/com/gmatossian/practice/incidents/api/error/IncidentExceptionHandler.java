package com.gmatossian.practice.incidents.api.error;

import com.gmatossian.practice.incidents.service.exception.IncidentNotFoundException;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentSearchException;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentTransitionException;
import com.gmatossian.practice.incidents.service.exception.InvalidIncidentUpdateException;
import com.gmatossian.practice.incidents.service.exception.SiteAccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class IncidentExceptionHandler {

    @ExceptionHandler(InvalidIncidentTransitionException.class)
    public ProblemDetail invalidTransition(InvalidIncidentTransitionException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(InvalidIncidentUpdateException.class)
    public ProblemDetail invalidUpdate(InvalidIncidentUpdateException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(IncidentNotFoundException.class)
    public ProblemDetail notFound(IncidentNotFoundException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(InvalidIncidentSearchException.class)
    public ProblemDetail invalidSearch(InvalidIncidentSearchException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(SiteAccessDeniedException.class)
    public ProblemDetail accessDenied(SiteAccessDeniedException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail invalidParameter(MethodArgumentTypeMismatchException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
                "Invalid value for parameter '" + exception.getName() + "'");
    }
}
