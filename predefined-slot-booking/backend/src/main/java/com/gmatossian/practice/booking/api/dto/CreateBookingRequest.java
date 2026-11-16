package com.gmatossian.practice.booking.api.dto;

// TODO: idempotency-key transport remains deliberately undecided.
public record CreateBookingRequest(Long slotId) {}
