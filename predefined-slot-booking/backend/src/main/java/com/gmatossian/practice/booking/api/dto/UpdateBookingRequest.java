package com.gmatossian.practice.booking.api.dto;

import com.gmatossian.practice.booking.domain.BookingStatus;

// TODO: validate exactly one action. Expected-version metadata shape is still to be decided.
public record UpdateBookingRequest(Long slotId, BookingStatus status) {}
