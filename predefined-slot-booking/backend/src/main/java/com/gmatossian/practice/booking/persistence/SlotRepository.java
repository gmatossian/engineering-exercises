package com.gmatossian.practice.booking.persistence;

import com.gmatossian.practice.booking.domain.Slot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;

public interface SlotRepository extends JpaRepository<Slot, Long> {
    default List<Slot> findAvailable(Instant now) {
        // TODO: replace this placeholder with a JPA query for unbooked future slots.
        throw new UnsupportedOperationException("Exercise: find available slots");
    }

    default int claimAvailable(long slotId, Instant now) {
        // TODO: conditional database update; return affected rows. A read/set/save is insufficient.
        throw new UnsupportedOperationException("Exercise: atomically claim a slot");
    }

    default int release(long slotId) {
        // TODO: release within the same transaction as a valid booking mutation.
        throw new UnsupportedOperationException("Exercise: release a slot");
    }
}
