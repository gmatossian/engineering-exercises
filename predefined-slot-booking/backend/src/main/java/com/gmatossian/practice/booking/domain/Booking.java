package com.gmatossian.practice.booking.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false)
    private Slot slot;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "applicant_id", nullable = false)
    private Applicant applicant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Version
    private Long version;

    protected Booking() {}

    public Booking(Slot slot, Applicant applicant, BookingStatus status) {
        this.slot = slot;
        this.applicant = applicant;
        this.status = status;
    }

    public Long getId() { return id; }
    public Slot getSlot() { return slot; }
    public Applicant getApplicant() { return applicant; }
    public BookingStatus getStatus() { return status; }
    public Long getVersion() { return version; }
    public void setSlot(Slot slot) { this.slot = slot; }
    public void setStatus(BookingStatus status) { this.status = status; }
}
