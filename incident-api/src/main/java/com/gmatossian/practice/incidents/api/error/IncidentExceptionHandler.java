package com.gmatossian.practice.incidents.api.error;

import com.gmatossian.practice.incidents.service.exception.InvalidIncidentSearchException;
import com.gmatossian.practice.incidents.service.exception.SiteAccessDeniedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class IncidentExceptionHandler {




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
