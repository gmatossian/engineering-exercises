package com.gmatossian.practice.booking;

import com.gmatossian.practice.booking.config.DemoApplicantContext;
import com.gmatossian.practice.booking.domain.*;
import com.gmatossian.practice.booking.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class BookingApplicationTests {
    @Autowired ApplicantRepository applicants;
    @Autowired SlotRepository slots;
    @Autowired BookingRepository bookings;
    @Autowired DemoApplicantContext applicantContext;

    @Test
    @Transactional
    void startsWithUsableAndConsistentJpaFixtures() {
        assertThat(applicants.findById(applicantContext.applicantId())).isPresent();
        var allSlots = slots.findAll();
        assertThat(allSlots).hasSize(13);
        assertThat(allSlots.stream().filter(s -> s.getStartTime().isAfter(Instant.now())))
                .hasSize(12);
        assertThat(allSlots.stream().filter(Slot::isBooked)).hasSize(1);
        assertThat(bookings.findAll()).hasSize(2).allSatisfy(booking -> {
            assertThat(booking.getVersion()).isNotNull();
            assertThat(booking.getSlot().isBooked()).isEqualTo(booking.getStatus() == BookingStatus.ACTIVE);
        });
        assertThat(bookings.findAll().stream().filter(b -> b.getApplicant().getId()
                .equals(applicantContext.applicantId())))
                .allMatch(b -> b.getStatus() == BookingStatus.CANCELLED);
    }
}
