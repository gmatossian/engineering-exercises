package com.gmatossian.practice.booking.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "slots")
public class Slot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant startTime;
    @Column(nullable = false)
    private Instant endTime;
    @Column(nullable = false)
    private boolean booked;

    protected Slot() {}

    public Slot(Instant startTime, Instant endTime, boolean booked) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.booked = booked;
    }

    public Long getId() { return id; }
    public Instant getStartTime() { return startTime; }
    public Instant getEndTime() { return endTime; }
    public boolean isBooked() { return booked; }
    public void setBooked(boolean booked) { this.booked = booked; }
}
