package com.gmatossian.practice.booking.config;

import com.gmatossian.practice.booking.domain.*;
import com.gmatossian.practice.booking.persistence.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.ArrayList;

@Component
public class DemoData implements CommandLineRunner {
    private final ApplicantRepository applicants;
    private final SlotRepository slots;
    private final BookingRepository bookings;

    public DemoData(ApplicantRepository applicants, SlotRepository slots, BookingRepository bookings) {
        this.applicants = applicants;
        this.slots = slots;
        this.bookings = bookings;
    }

    @Override
    @Transactional
    public void run(String... args) {
        Applicant currentApplicant = applicants.save(new Applicant());
        Applicant otherApplicant = applicants.save(new Applicant());
        Instant first = LocalDate.now(ZoneOffset.UTC).plusDays(1).atTime(9, 0).toInstant(ZoneOffset.UTC);
        var futureSlots = new ArrayList<Slot>();
        // Fixture choice only: twelve non-overlapping 30-minute slots, relative to each startup.
        for (int i = 0; i < 12; i++) {
            Instant start = first.plus(Duration.ofMinutes(30L * i));
            futureSlots.add(slots.save(new Slot(start, start.plus(Duration.ofMinutes(30)), i == 3)));
        }
        Instant past = Instant.now().minus(Duration.ofDays(1));
        slots.save(new Slot(past, past.plus(Duration.ofMinutes(30)), false));
        bookings.save(new Booking(futureSlots.get(3), otherApplicant, BookingStatus.ACTIVE));
        bookings.save(new Booking(futureSlots.get(6), currentApplicant, BookingStatus.CANCELLED));
    }
}
