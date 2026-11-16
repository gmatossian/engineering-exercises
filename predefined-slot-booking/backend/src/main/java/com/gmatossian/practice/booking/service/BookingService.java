package com.gmatossian.practice.booking.service;

import com.gmatossian.practice.booking.api.dto.*;
import com.gmatossian.practice.booking.config.DemoApplicantContext;
import com.gmatossian.practice.booking.persistence.*;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class BookingService {
    private final SlotRepository slots;
    private final BookingRepository bookings;
    private final DemoApplicantContext applicantContext;

    public BookingService(SlotRepository slots, BookingRepository bookings,
                          DemoApplicantContext applicantContext) {
        this.slots = slots;
        this.bookings = bookings;
        this.applicantContext = applicantContext;
    }

    public List<SlotResponse> getAvailableSlots() {
        throw new UnsupportedOperationException("Exercise: list and map available slots");
    }

    public List<BookingResponse> getBookings() {
        throw new UnsupportedOperationException("Exercise: list and map current applicant bookings");
    }

    public BookingResponse createBooking(Long slotId, String idempotencyKey) {
        // Internal key argument does not choose its HTTP transport.
        // TODO: the reviewed one-transaction flow. Do not implement it with JVM-only locking.
        throw new UnsupportedOperationException("Exercise: create a booking transactionally");
    }

    public BookingResponse updateBooking(long bookingId, UpdateBookingRequest request) {
        // TODO: expected-version input; ownership; cancel OR reschedule; atomic flag consistency.
        throw new UnsupportedOperationException("Exercise: cancel or reschedule transactionally");
    }
}
