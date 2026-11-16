package com.gmatossian.practice.booking.api;

import com.gmatossian.practice.booking.api.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
public class BookingController {
    @GetMapping("/slots")
    public List<SlotResponse> getAvailableSlots() {
        // TODO: call the service and return the available-slot DTOs.
        throw unfinished("list available slots");
    }

    @GetMapping("/bookings")
    public List<BookingResponse> getBookings() {
        // TODO: obtain identity from DemoApplicantContext, then call the service.
        throw unfinished("list current applicant bookings");
    }

    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(@RequestBody CreateBookingRequest request) {
        // TODO: decide idempotency transport, validate input, obtain identity, delegate.
        throw unfinished("create a booking");
    }

    @PatchMapping("/bookings/{id}")
    public BookingResponse updateBooking(@PathVariable("id") long id,
                                         @RequestBody UpdateBookingRequest request) {
        // TODO: validate exactly one mutation, add expected-version input, delegate.
        throw unfinished("cancel or reschedule a booking");
    }

    private static ResponseStatusException unfinished(String exercise) {
        return new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Exercise: " + exercise);
    }
}
