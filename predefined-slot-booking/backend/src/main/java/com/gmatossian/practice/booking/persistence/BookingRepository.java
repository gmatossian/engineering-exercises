package com.gmatossian.practice.booking.persistence;

import com.gmatossian.practice.booking.domain.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    default List<Booking> findForApplicant(long applicantId) {
        // TODO: include active and cancelled bookings; fetch relationships needed for DTO mapping.
        throw new UnsupportedOperationException("Exercise: list applicant bookings");
    }

    default Optional<Booking> findOwned(long bookingId, long applicantId) {
        // TODO: lookup restricted to the applicant.
        throw new UnsupportedOperationException("Exercise: find an owned booking");
    }

    // TODO: enforce one active booking per applicant atomically, not only with an existence read.
    // TODO: design the idempotency record/repository after its remaining choices are reviewed.
}
