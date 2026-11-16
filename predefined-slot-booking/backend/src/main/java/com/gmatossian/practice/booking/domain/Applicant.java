package com.gmatossian.practice.booking.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "applicants")
public class Applicant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public Applicant() {}

    public Long getId() { return id; }
    // Associated bookings are queried through BookingRepository, not a second stored list.
}
